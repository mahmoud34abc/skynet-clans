import os
import sqlite3
import asyncio
from datetime import datetime, timezone

import discord
from discord.ext import commands
from discord.ui import View, Button, Modal, TextInput
from dotenv import load_dotenv

# ------------------ CONFIG ------------------
load_dotenv(dotenv_path="./code/Python/.env")
TOKEN = os.getenv("DISCORD_TOKEN")
LOG_CHANNEL_ID = os.getenv("LOG_CHANNEL_ID")
if not TOKEN:
    raise ValueError("DISCORD_TOKEN missing in .env")
if not LOG_CHANNEL_ID:
    raise ValueError("LOG_CHANNEL_ID missing in .env")
try:
    LOG_CHANNEL_ID = int(LOG_CHANNEL_ID)
except ValueError:
    raise ValueError("LOG_CHANNEL_ID must be numeric")

CLAIM_TIMEOUT_SECS = 45 * 60  # 45 minutes
DB_PATH = "tickets.db"

import sqlite3

def migrate_server_appeals_table():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("PRAGMA table_info(server_appeals)")
    cols = {row[1] for row in cur.fetchall()}

    def ensure(col, ddl):
        if col not in cols:
            cur.execute(f"ALTER TABLE server_appeals ADD COLUMN {col} {ddl}")

    ensure("code", "TEXT")
    ensure("review_message_id", "INTEGER")
    ensure("claimed_by", "INTEGER")
    ensure("claimed_at", "TEXT")
    ensure("decided_by", "INTEGER")
    ensure("decided_at", "TEXT")
    ensure("decision", "TEXT")
    ensure("reason", "TEXT")
    ensure("investigate_channel_id", "INTEGER")

    con.commit()
    con.close()


SUPPORT_CHANNEL_ID = os.getenv("SUPPORT_CHANNEL_ID")
if not SUPPORT_CHANNEL_ID:
    raise ValueError("SUPPORT_CHANNEL_ID missing in .env")
try:
    SUPPORT_CHANNEL_ID = int(SUPPORT_CHANNEL_ID)
except ValueError:
    raise ValueError("SUPPORT_CHANNEL_ID must be numeric")

# ------------------ DB ------------------
def utc_now_str():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def db_init():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS tickets(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_code TEXT UNIQUE,
        opener_id INTEGER,
        opener_tag TEXT,
        ticket_type TEXT,
        content TEXT,
        log_message_id INTEGER,
        created_at TEXT,
        claimed_by INTEGER,
        claimed_at TEXT,
        decided_by INTEGER,
        decided_at TEXT,
        decision TEXT,
        reason TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS mod_stats(
        mod_id INTEGER PRIMARY KEY,
        handled_total INTEGER NOT NULL DEFAULT 0
    )
    """)
    con.commit()
    con.close()

def db_create_ticket(opener, ticket_type, content, log_message_id=None):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        INSERT INTO tickets(opener_id, opener_tag, ticket_type, content, created_at, log_message_id)
        VALUES(?,?,?,?,?,?)
    """, (opener.id, f"{opener.name}#{opener.discriminator}", ticket_type, content, utc_now_str(), log_message_id))
    tid = cur.lastrowid
    code = f"DLS-{tid:05d}"
    cur.execute("UPDATE tickets SET ticket_code=? WHERE id=?", (code, tid))
    con.commit()
    con.close()
    return code

def db_attach_log_message(ticket_code, message_id):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("UPDATE tickets SET log_message_id=? WHERE ticket_code=?", (message_id, ticket_code))
    con.commit()
    con.close()

def db_get_by_message(message_id):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT ticket_code, opener_id, ticket_type, content, claimed_by, decided_by FROM tickets WHERE log_message_id=?", (message_id,))
    row = cur.fetchone()
    con.close()
    return row

def db_claim(ticket_code, mod_id):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        UPDATE tickets SET claimed_by=?, claimed_at=?
        WHERE ticket_code=? AND (claimed_by IS NULL OR claimed_by=0) AND decided_by IS NULL
    """, (mod_id, utc_now_str(), ticket_code))
    con.commit()
    ok = cur.rowcount > 0
    con.close()
    return ok

def db_unclaim_if_unresolved(ticket_code, mod_id):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        UPDATE tickets SET claimed_by=NULL, claimed_at=NULL
        WHERE ticket_code=? AND decided_by IS NULL AND claimed_by=?
    """, (ticket_code, mod_id))
    con.commit()
    ok = cur.rowcount > 0
    con.close()
    return ok

def db_decide(ticket_code, mod_id, decision, reason):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        UPDATE tickets SET decided_by=?, decided_at=?, decision=?, reason=?
        WHERE ticket_code=? AND decided_by IS NULL
    """, (mod_id, utc_now_str(), decision, reason, ticket_code))
    con.commit()
    ok = cur.rowcount > 0
    con.close()
    return ok

def db_inc_mod_total(mod_id):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("INSERT INTO mod_stats(mod_id, handled_total) VALUES(?,0) ON CONFLICT(mod_id) DO NOTHING", (mod_id,))
    cur.execute("UPDATE mod_stats SET handled_total = handled_total + 1 WHERE mod_id=?", (mod_id,))
    con.commit()
    con.close()

def db_get_mod_total(mod_id):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("SELECT handled_total FROM mod_stats WHERE mod_id=?", (mod_id,))
    row = cur.fetchone()
    con.close()
    return row[0] if row else 0

# ------------------ BOT ------------------
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Guaranteed log channel getter (cache + fetch)
async def get_log_channel():
    ch = bot.get_channel(LOG_CHANNEL_ID)
    if ch is None:
        try:
            ch = await bot.fetch_channel(LOG_CHANNEL_ID)
        except Exception:
            ch = None
    return ch
async def get_support_channel():
    ch = bot.get_channel(SUPPORT_CHANNEL_ID)
    if ch is None:
        try:
            ch = await bot.fetch_channel(SUPPORT_CHANNEL_ID)
        except Exception:
            ch = None
    return ch

claim_timeout_tasks: dict[int, asyncio.Task] = {}  # key = log_message_id

# ------------------ MODALS ------------------
class ReportModal(Modal, title="Report Rulebreaker"):
    def __init__(self, opener: discord.Member):
        super().__init__()
        self.opener = opener
        self.username = TextInput(label="Roblox Player Username", required=True)
        self.reason = TextInput(label="Reason - What happened?", style=discord.TextStyle.paragraph, required=True)
        self.proof = TextInput(label='Proof "URL"', required=True, placeholder="YouTube / Streamable / Drive …")
        self.add_item(self.username)
        self.add_item(self.reason)
        self.add_item(self.proof)

    async def on_submit(self, interaction: discord.Interaction):
        await send_ticket_to_log(
            interaction=interaction,
            ticket_type="Report Rulebreaker",
            opener=self.opener,
            content_dict={
                "Roblox Player Username": self.username.value,
                "Reason - What happened?": self.reason.value,
                'Proof "URL"': self.proof.value,
            },
        )

class AppealModal(Modal, title="Appeal Ban"):
    def __init__(self, opener: discord.Member):
        super().__init__()
        self.opener = opener
        self.where = TextInput(label="Which DLS Game you banned on?", required=True)
        self.why = TextInput(label="Why were you banned?", required=True)
        self.explain = TextInput(label="Explain yourself and situation", style=discord.TextStyle.paragraph, required=True)
        self.why_unban = TextInput(label="Why we should un-ban you?", style=discord.TextStyle.paragraph, required=True)
        self.add_item(self.where)
        self.add_item(self.why)
        self.add_item(self.explain)
        self.add_item(self.why_unban)

    async def on_submit(self, interaction: discord.Interaction):
        await send_ticket_to_log(
            interaction=interaction,
            ticket_type="Appeal Ban",
            opener=self.opener,
            content_dict={
                "Which DLS Game you banned on?": self.where.value,
                "Why were you banned?": self.why.value,
                "Explain yourself and situation": self.explain.value,
                "Why we should un-ban you?": self.why_unban.value,
            },
        )

class OtherSupportModal(Modal, title="Other Support"):
    def __init__(self, opener: discord.Member):
        super().__init__()
        self.opener = opener
        self.topic = TextInput(label="Issue-Topic", required=True)
        self.details = TextInput(label="Details", style=discord.TextStyle.paragraph, required=True)
        self.add_item(self.topic)
        self.add_item(self.details)

    async def on_submit(self, interaction: discord.Interaction):
        await send_ticket_to_log(
            interaction=interaction,
            ticket_type="Other Support",
            opener=self.opener,
            content_dict={
                "Issue-Topic": self.topic.value,
                "Details": self.details.value,
            },
        )

# ------------------ MODERATION ------------------
class DecisionModal(Modal, title="Decision Reason"):
    def __init__(self, ticket_code: str, opener_id: int, accept: bool, log_message: discord.Message):
        super().__init__()
        self.ticket_code = ticket_code
        self.opener_id = opener_id
        self.accept = accept
        self.log_message = log_message
        self.reason = TextInput(label="Reason to send in DM", style=discord.TextStyle.paragraph, required=True)
        self.add_item(self.reason)

    async def on_submit(self, interaction: discord.Interaction):
        tc = db_get_by_message(self.log_message.id)
        if not tc:
            return await interaction.response.send_message("Ticket not found.", ephemeral=True)
        ticket_code, opener_id, ticket_type, content, claimed_by, decided_by = tc

        if claimed_by != interaction.user.id:
            return await interaction.response.send_message("You must claim this ticket first.", ephemeral=True)

        if not db_decide(ticket_code, interaction.user.id, "Accepted" if self.accept else "Denied", self.reason.value):
            return await interaction.response.send_message("This ticket is already decided.", ephemeral=True)

        db_inc_mod_total(interaction.user.id)

        # DM to opener
        dm_note = ""
        try:
            user = await interaction.client.fetch_user(self.opener_id)
            dm_embed = discord.Embed(
                title="Your request has been ACCEPTED ✅" if self.accept else "Your request has been DENIED ❌",
                description=self.reason.value,
                color=discord.Color.green() if self.accept else discord.Color.red()
            )
            await user.send(embed=dm_embed)
        except discord.Forbidden:
            dm_note = "DM to user failed (closed DMs)."

        # Update log message and remove buttons
        new_embed = self.log_message.embeds[0]
        new_embed.add_field(name="Decision", value=("Accepted ✅" if self.accept else "Denied ❌"), inline=True)
        new_embed.add_field(name="Decided by", value=interaction.user.mention, inline=True)
        new_embed.add_field(name="Decided at", value=utc_now_str(), inline=False)
        new_embed.add_field(name="Decision Reason", value=self.reason.value[:1024], inline=False)
        if dm_note:
            old = (new_embed.footer.text if new_embed.footer else "")
            new_embed.set_footer(text=(old + (" • " if old else "") + dm_note))
        await self.log_message.edit(embed=new_embed, view=None)

        # Decision log
        await send_decision_log(
            ticket_code=ticket_code,
            opener_id=opener_id,
            mod_id=interaction.user.id,
            decision=("Accepted" if self.accept else "Denied"),
            reason=self.reason.value,
            jump_url=self.log_message.jump_url,
        )

        # cancel timeout
        task = claim_timeout_tasks.pop(self.log_message.id, None)
        if task:
            task.cancel()

        await interaction.response.send_message("Decision saved and user notified.", ephemeral=True)

class ModerationView(View):
    def __init__(self, ticket_code: str, opener_id: int, log_message: discord.Message):
        super().__init__(timeout=None)
        self.ticket_code = ticket_code
        self.opener_id = opener_id
        self.log_message = log_message

    @discord.ui.button(label="Claim", style=discord.ButtonStyle.primary, emoji="📥")
    async def claim_btn(self, interaction: discord.Interaction, button: Button):
        tc = db_get_by_message(self.log_message.id)
        if not tc:
            return await interaction.response.send_message("Ticket not found.", ephemeral=True)
        ticket_code, opener_id, ticket_type, content, claimed_by, decided_by = tc
        if decided_by:
            return await interaction.response.send_message("This ticket is already decided.", ephemeral=True)
        if claimed_by and claimed_by != 0:
            return await interaction.response.send_message("This ticket is already claimed.", ephemeral=True)

        if not db_claim(ticket_code, interaction.user.id):
            return await interaction.response.send_message("Could not claim. Try again.", ephemeral=True)

        emb = self.log_message.embeds[0]
        emb.add_field(name="Claimed by", value=interaction.user.mention, inline=True)
        emb.add_field(name="Claimed at", value=utc_now_str(), inline=True)
        await self.log_message.edit(embed=emb)

        # claim log
        await send_claim_log(self.ticket_code, self.opener_id, interaction.user.id, self.log_message.jump_url)

        # auto-unclaim timer (45m)
        async def timer():
            try:
                await asyncio.sleep(CLAIM_TIMEOUT_SECS)
                if db_unclaim_if_unresolved(ticket_code, interaction.user.id):
                    # DM warn
                    dm_failed = False
                    try:
                        warn = discord.Embed(
                            title="Claim timeout ⏰",
                            description=f"You claimed **{ticket_code}** but did not decide within 45 minutes. It has been unclaimed.",
                            color=discord.Color.orange()
                        )
                        await interaction.user.send(embed=warn)
                    except discord.Forbidden:
                        dm_failed = True

                    e2 = self.log_message.embeds[0]
                    e2.add_field(name="Auto Unclaim", value="No decision in 45 minutes", inline=False)
                    if dm_failed:
                        old = (e2.footer.text if e2.footer else "")
                        e2.set_footer(text=(old + (" • " if old else "") + "DM to claimer failed"))
                    await self.log_message.edit(embed=e2)

                    # unclaim log
                    await send_unclaim_log(self.ticket_code, self.opener_id, interaction.user.id, self.log_message.jump_url)
            except asyncio.CancelledError:
                pass

        task = asyncio.create_task(timer())
        claim_timeout_tasks[self.log_message.id] = task
        await interaction.response.send_message("You claimed this ticket.", ephemeral=True)

    @discord.ui.button(label="Accept", style=discord.ButtonStyle.success, emoji="✅")
    async def accept_btn(self, interaction: discord.Interaction, button: Button):
        tc = db_get_by_message(self.log_message.id)
        if not tc:
            return await interaction.response.send_message("Ticket not found.", ephemeral=True)
        ticket_code, opener_id, ticket_type, content, claimed_by, decided_by = tc
        if claimed_by != interaction.user.id:
            return await interaction.response.send_message("You must claim this ticket first.", ephemeral=True)
        await interaction.response.send_modal(DecisionModal(ticket_code, opener_id, True, self.log_message))

    @discord.ui.button(label="Deny", style=discord.ButtonStyle.danger, emoji="❌")
    async def deny_btn(self, interaction: discord.Interaction, button: Button):
        tc = db_get_by_message(self.log_message.id)
        if not tc:
            return await interaction.response.send_message("Ticket not found.", ephemeral=True)
        ticket_code, opener_id, ticket_type, content, claimed_by, decided_by = tc
        if claimed_by != interaction.user.id:
            return await interaction.response.send_message("You must claim this ticket first.", ephemeral=True)
        await interaction.response.send_modal(DecisionModal(ticket_code, opener_id, False, self.log_message))

# ------------------ USER MENU ------------------
class TicketView(View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Report Rulebreaker", style=discord.ButtonStyle.danger, emoji="📩", custom_id="report_rulebreaker_btn")
    async def report_btn(self, interaction: discord.Interaction, button: Button):
        await interaction.response.send_modal(ReportModal(interaction.user))

    @discord.ui.button(label="Appeal Ban", style=discord.ButtonStyle.primary, emoji="⛔", custom_id="appeal_ban_btn")
    async def appeal_btn(self, interaction: discord.Interaction, button: Button):
        await interaction.response.send_modal(AppealModal(interaction.user))

    @discord.ui.button(label="Other Support", style=discord.ButtonStyle.secondary, emoji="❓", custom_id="other_support_btn")
    async def other_btn(self, interaction: discord.Interaction, button: Button):
        await interaction.response.send_modal(OtherSupportModal(interaction.user))

# ------------------ LOG HELPERS ------------------
async def get_support_channel():
    ch = bot.get_channel(SUPPORT_CHANNEL_ID)
    if ch is None:
        try:
            ch = await bot.fetch_channel(SUPPORT_CHANNEL_ID)
        except Exception:
            ch = None
    return ch
async def send_ticket_to_log(interaction: discord.Interaction, ticket_type: str, opener: discord.Member, content_dict: dict):
    # pack content for DB (truncate long)
    def kv_to_text(d: dict) -> str:
        parts = []
        for k, v in d.items():
            v = (v or "").strip()
            if len(v) > 1500:
                v = v[:1500] + " …(truncated)"
            parts.append(f"{k}: {v}")
        return "\n".join(parts)

    content_text = kv_to_text(content_dict)
    ticket_code = db_create_ticket(opener, ticket_type, content_text)

    inbox_channel = await get_support_channel()
    if not inbox_channel:
        return await interaction.response.send_message("⚠️ Support inbox channel not found. Check SUPPORT_CHANNEL_ID.", ephemeral=True)

    embed = discord.Embed(title=f"📩 New Ticket — {ticket_code}", color=discord.Color.blurple())
    embed.add_field(name="Type", value=ticket_type, inline=True)
    embed.add_field(name="Opened by", value=f"{opener.mention} (`{opener.id}`)", inline=False)
    for k, v in content_dict.items():
        embed.add_field(name=k, value=(v if v else "—"), inline=False)

    msg = await inbox_channel.send(embed=embed)
    db_attach_log_message(ticket_code, msg.id)
    view = ModerationView(ticket_code=ticket_code, opener_id=opener.id, log_message=msg)
    await msg.edit(view=view)

    await interaction.response.send_message(
        "✅ Your report has been successfully submitted to the authorities. You will receive a response soon.",
        ephemeral=True
    )

async def send_claim_log(ticket_code: str, opener_id: int, mod_id: int, jump_url: str):
    ch = await get_log_channel()
    if not ch: return
    embed = discord.Embed(title=f"📝 Ticket Claimed — {ticket_code}", color=discord.Color.orange())
    embed.add_field(name="Opened by", value=f"<@{opener_id}>", inline=True)
    embed.add_field(name="Claimed by", value=f"<@{mod_id}>", inline=True)
    embed.add_field(name="Claimed at", value=utc_now_str(), inline=False)
    embed.add_field(name="Jump", value=f"[Go to message]({jump_url})", inline=False)
    await ch.send(embed=embed)

async def send_unclaim_log(ticket_code: str, opener_id: int, mod_id: int, jump_url: str):
    ch = await get_log_channel()
    if not ch: return
    embed = discord.Embed(title=f"⏪ Auto Unclaim — {ticket_code}", color=discord.Color.dark_orange())
    embed.add_field(name="Opened by", value=f"<@{opener_id}>", inline=True)
    embed.add_field(name="Previous claimer", value=f"<@{mod_id}>", inline=True)
    embed.add_field(name="Time", value=utc_now_str(), inline=False)
    embed.add_field(name="Jump", value=f"[Go to message]({jump_url})", inline=False)
    await ch.send(embed=embed)

async def send_decision_log(ticket_code: str, opener_id: int, mod_id: int, decision: str, reason: str, jump_url: str):
    ch = await get_log_channel()
    if not ch: return
    embed = discord.Embed(title=f"✅ Decision Logged — {ticket_code}", color=discord.Color.green() if decision=="Accepted" else discord.Color.red())
    embed.add_field(name="Opened by", value=f"<@{opener_id}>", inline=True)
    embed.add_field(name="Handled by", value=f"<@{mod_id}>", inline=True)
    embed.add_field(name="Decision", value=decision, inline=True)
    embed.add_field(name="Decided at", value=utc_now_str(), inline=False)
    embed.add_field(name="Reason", value=reason[:1024], inline=False)
    embed.add_field(name="Jump", value=f"[Go to message]({jump_url})", inline=False)
    await ch.send(embed=embed)

# ------------------ COMMANDS ------------------
@bot.command()
@commands.has_permissions(administrator=True)
async def ticketsetup(ctx):
    """Send the support ticket menu (admin only)."""
    embed = discord.Embed(
        title="🎟 Support Tickets",
        description=(
            "You can get help here for reporting cheaters, creating ban requests, and other issues.\n\n"
            "Choose a ticket type below:\n"
            "📩 **Report Rulebreaker** — Report people who break the rules in DLS games.\n"
            "⛔ **Appeal Ban** — Appeal your ban.\n"
            "❓ **Other Support** — You can use Other support tickets for issues like reporting a staff member, "
            "reporting a minor or major server issue etc."
        ),
        color=discord.Color.blue()
    )
    await ctx.send(embed=embed, view=TicketView())

@bot.command()
async def modstats(ctx, member: discord.Member | None = None):
    """Show total tickets handled."""
    target = member or ctx.author
    total = db_get_mod_total(target.id)
    embed = discord.Embed(title="👤 Moderator Stats", color=discord.Color.blurple())
    embed.add_field(name="Moderator", value=target.mention, inline=True)
    embed.add_field(name="Handled (total)", value=str(total), inline=True)
    await ctx.send(embed=embed)


# ===================== SERVER APPEAL SYSTEM =====================
import discord
from discord.ext import commands
from discord.ui import View, Button, Modal, TextInput
import sqlite3
from datetime import datetime, timezone

# ---- CONFIG ----
APPEAL_FORM_CHANNEL_ID = 1404429934063255675
APPEAL_MOD_CHANNEL_ID = 1404432477191409724
APPEAL_LOG_CHANNEL_ID = 1404432626583867463
MOD_ROLE_ID = 1329507019408805991
ADMIN_ROLE_ID = 1329506643976781895
INVESTIGATE_CATEGORY_ID = 1404434539689803877

DB_PATH = "tickets.db"

import sqlite3

def migrate_server_appeals_table():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("PRAGMA table_info(server_appeals)")
    cols = {row[1] for row in cur.fetchall()}

    def ensure(col, ddl):
        if col not in cols:
            cur.execute(f"ALTER TABLE server_appeals ADD COLUMN {col} {ddl}")

    ensure("code", "TEXT")
    ensure("review_message_id", "INTEGER")
    ensure("claimed_by", "INTEGER")
    ensure("claimed_at", "TEXT")
    ensure("decided_by", "INTEGER")
    ensure("decided_at", "TEXT")
    ensure("decision", "TEXT")
    ensure("reason", "TEXT")
    ensure("investigate_channel_id", "INTEGER")

    con.commit()
    con.close()



# ---- DB INIT ----
def init_appeal_db():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS server_appeals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            reason TEXT,
            why_accept TEXT,
            extra TEXT,
            status TEXT,
            claimed_by INTEGER,
            message_id INTEGER,
            created_at TEXT
        )
    """)
    con.commit()
    con.close()

init_appeal_db()

# ---- APPEAL MODAL ----
class ServerAppealModal(Modal):
    def __init__(self, user: discord.User):
        super().__init__(title="Server Ban Appeal")
        self.user = user

        self.reason = TextInput(label="Why were you banned?", style=discord.TextStyle.paragraph, max_length=500)
        self.why_accept = TextInput(label="Why should we accept your appeal?", style=discord.TextStyle.paragraph, max_length=500)
        self.extra = TextInput(label="Anything else you want to add? (Optional)", style=discord.TextStyle.paragraph, required=False, max_length=500)

        self.add_item(self.reason)
        self.add_item(self.why_accept)
        self.add_item(self.extra)

    async def on_submit(self, interaction: discord.Interaction):
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("""
            INSERT INTO server_appeals (user_id, reason, why_accept, extra, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            self.user.id,
            self.reason.value,
            self.why_accept.value,
            self.extra.value,
            "Pending",
            datetime.datetime.utcnow().isoformat()
        ))
        appeal_id = cur.lastrowid
        con.commit()
        con.close()

        # Send to moderation channel
        mod_ch = interaction.client.get_channel(APPEAL_MOD_CHANNEL_ID)
        embed = discord.Embed(
            title=f"📨 New Server Ban Appeal #{appeal_id}",
            color=discord.Color.orange()
        )
        embed.add_field(name="User", value=f"{self.user.mention} ({self.user.id})", inline=False)
        embed.add_field(name="Reason for Ban", value=self.reason.value, inline=False)
        embed.add_field(name="Why Accept?", value=self.why_accept.value, inline=False)
        embed.add_field(name="Extra", value=self.extra.value if self.extra.value else "N/A", inline=False)
        embed.set_footer(text="Server Appeal System")

        msg = await mod_ch.send(embed=embed, view=AppealModerationView(appeal_id, self.user.id))
        
        # Update DB with message ID
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("UPDATE server_appeals SET message_id = ? WHERE id = ?", (msg.id, appeal_id))
        con.commit()
        con.close()

        await interaction.response.send_message("✅ Your appeal has been submitted!", ephemeral=True)

@bot.command()
@commands.has_permissions(manage_channels=True)
async def closeinvestigate(ctx, appeal_code: str | None = None):
    """
    Close the investigation channel for a server appeal.
    Usage:
      - Run inside the investigate channel: !closeinvestigate
      - Or anywhere with code: !closeinvestigate SA-00001
    """
    # 1) Hedef kanalı ve kodu bul
    target_channel = None
    code = appeal_code

    if code is None:
        # Kanal adından dene: investigate-SA-00001
        if ctx.channel.name.startswith("investigate-"):
            code = ctx.channel.name.replace("investigate-", "").strip()
            target_channel = ctx.channel
        else:
            # DB'den bu kanal bir investigate kanalı mı bak
            con = sqlite3.connect(DB_PATH); cur = con.cursor()
            cur.execute("SELECT code FROM server_appeals WHERE investigate_channel_id = ?", (ctx.channel.id,))
            row = cur.fetchone()
            con.close()
            if row:
                code = row[0]
                target_channel = ctx.channel
            else:
                return await ctx.send("❌ This isn’t an investigation channel. Provide an appeal code: `!closeinvestigate SA-00001`")

    # 2) DB'den investigate channel ID’yi çek
    con = sqlite3.connect(DB_PATH); cur = con.cursor()
    cur.execute("SELECT investigate_channel_id FROM server_appeals WHERE code = ?", (code,))
    row = cur.fetchone()
    con.close()
    if not row or not row[0]:
        return await ctx.send("❌ No investigation channel found for that appeal code.")

    inv_id = row[0]
    if target_channel is None:
        # Kod verildiyse kanalı fetch et
        target_channel = ctx.guild.get_channel(inv_id) or await bot.fetch_channel(inv_id)

    # 3) Sil ve logla
    try:
        await target_channel.delete(reason=f"Closed by {ctx.author}")
    except Exception as e:
        return await ctx.send(f"⚠️ Could not delete channel: `{e}`")

    # DB’de referansı temizleyelim (opsiyonel ama iyi pratik)
    con = sqlite3.connect(DB_PATH); cur = con.cursor()
    cur.execute("UPDATE server_appeals SET investigate_channel_id = NULL WHERE code = ?", (code,))
    con.commit(); con.close()

    # Log
    log_ch = bot.get_channel(APPEAL_LOG_CHANNEL_ID) or await bot.fetch_channel(APPEAL_LOG_CHANNEL_ID)
    if log_ch:
        e = discord.Embed(title=f"🧹 Investigation Closed — {code}", color=discord.Color.dark_grey())
        e.add_field(name="Closed by", value=ctx.author.mention, inline=True)
        await log_ch.send(embed=e)

    # Kullanıcıya onay
    try:
        await ctx.send(f"✅ Investigation channel for **{code}** closed.", delete_after=6)
    except:
        pass


# ---- APPEAL BUTTONS FOR USERS ----
class OpenAppealView(View):
    def __init__(self):
        super().__init__(timeout=None)  # persistent view

    @discord.ui.button(
        label="Appeal Discord Ban",
        style=discord.ButtonStyle.primary,
        emoji="📨",
        custom_id="server_appeal_open"  # PERSISTENT İÇİN ZORUNLU
    )
    async def open_btn(self, interaction: discord.Interaction, button: Button):
        # Modal label'lar 45 karakteri aşmasın!
        modal = ServerAppealModal(interaction.user)
        await interaction.response.send_modal(modal)



# ---- MODERATION VIEW ----
class AppealModerationView(View):
    def __init__(self, appeal_id, user_id):
        super().__init__(timeout=None)
        self.appeal_id = appeal_id
        self.user_id = user_id
        self.claimed_by = None

    @discord.ui.button(label="Claim", style=discord.ButtonStyle.success)
    async def claim_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not any(r.id in [MOD_ROLE_ID, ADMIN_ROLE_ID] for r in interaction.user.roles):
            return await interaction.response.send_message("❌ You don't have permission.", ephemeral=True)

        if self.claimed_by is not None:
            return await interaction.response.send_message("❌ Already claimed.", ephemeral=True)

        self.claimed_by = interaction.user.id
        await interaction.response.send_message(f"✅ Claimed by {interaction.user.mention}", ephemeral=False)

    @discord.ui.button(label="Accept", style=discord.ButtonStyle.primary)
    async def accept_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.claimed_by != interaction.user.id:
            return await interaction.response.send_message("❌ You must claim this appeal first.", ephemeral=True)

        await self.update_status("Accepted", interaction)

    @discord.ui.button(label="Deny", style=discord.ButtonStyle.danger)
    async def deny_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.claimed_by != interaction.user.id:
            return await interaction.response.send_message("❌ You must claim this appeal first.", ephemeral=True)

        await self.update_status("Denied", interaction)

    @discord.ui.button(label="Investigate", style=discord.ButtonStyle.secondary)
    async def investigate_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not any(r.id in [MOD_ROLE_ID, ADMIN_ROLE_ID] for r in interaction.user.roles):
            return await interaction.response.send_message("❌ No permission.", ephemeral=True)

        guild = interaction.guild
        category = discord.utils.get(guild.categories, id=INVESTIGATE_CATEGORY_ID)
        if not category:
            return await interaction.response.send_message("❌ Investigate category not found.", ephemeral=True)

        member = guild.get_member(self.user_id)
        if not member:
            return await interaction.response.send_message("❌ User not found.", ephemeral=True)

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(read_messages=False),
            member: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True)
        }
        channel = await guild.create_text_channel(name=f"investigate-{self.appeal_id}", overwrites=overwrites, category=category)
        await interaction.response.send_message(f"🔍 Investigation channel created: {channel.mention}", ephemeral=False)

    async def update_status(self, status, interaction):
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("UPDATE server_appeals SET status = ? WHERE id = ?", (status, self.appeal_id))
        con.commit()
        con.close()

        user = interaction.guild.get_member(self.user_id)
        if user:
            try:
                await user.send(embed=discord.Embed(
                    title="Server Ban Appeal Result",
                    description=f"Your appeal has been **{status}**.",
                    color=discord.Color.green() if status == "Accepted" else discord.Color.red()
                ))
            except:
                pass

        # Log
        log_ch = interaction.client.get_channel(APPEAL_LOG_CHANNEL_ID)
        log_embed = discord.Embed(title="📜 Appeal Log", color=discord.Color.blue())
        log_embed.add_field(name="Appeal ID", value=str(self.appeal_id), inline=False)
        log_embed.add_field(name="User", value=f"<@{self.user_id}>", inline=False)
        log_embed.add_field(name="Moderator", value=interaction.user.mention, inline=False)
        log_embed.add_field(name="Status", value=status, inline=False)
        log_embed.timestamp = datetime.datetime.utcnow()
        await log_ch.send(embed=log_embed)

        await interaction.message.edit(view=None)

@bot.command(aliases=["appealstats"])
async def serverappealstats(ctx, member: discord.Member | None = None):
    """
    Show how many server appeals a moderator has decided (Accepted/Denied).
    Usage: !serverappealstats  or  !serverappealstats @mod
    """
    target = member or ctx.author

    con = sqlite3.connect(DB_PATH); cur = con.cursor()
    cur.execute("""
        SELECT COUNT(*)
        FROM server_appeals
        WHERE decided_by = ? AND decision IS NOT NULL
    """, (target.id,))
    total = cur.fetchone()[0]
    con.close()

    emb = discord.Embed(title="📊 Server Appeal Stats", color=discord.Color.blurple())
    emb.add_field(name="Moderator", value=target.mention, inline=True)
    emb.add_field(name="Handled (total)", value=str(total), inline=True)
    emb.set_footer(text="Type: Server Appeal")
    await ctx.send(embed=emb)


# ---- SETUP COMMAND ----
@bot.command()
async def setup_server_appeal(ctx):
    if not any(r.id in [MOD_ROLE_ID, ADMIN_ROLE_ID] for r in ctx.author.roles):
        return await ctx.send("❌ You don't have permission.")

    ch = bot.get_channel(APPEAL_FORM_CHANNEL_ID) or await bot.fetch_channel(APPEAL_FORM_CHANNEL_ID)
    if not ch:
        return await ctx.send("❌ Form channel not found.")

    embed = discord.Embed(
        title="📨 Discord Server Ban Appeals",
        description=(
            "You can create a ticket and apply for a un-ban for the DLS Official Discord Server by clicking the button below.\n\n"
            "Use the button below to submit a **server ban appeal** (not in-game)."
        ),
        color=discord.Color.blue()
    )

    # Eski (persistent olmayan) mesajı silmek iyi olur; sonra yenisini gönder:
    await ch.send(embed=embed, view=OpenAppealView())
    await ctx.send("✅ Server appeal system setup complete.")





# ------------------ READY (REPLACE EVERYTHING) ------------------

def db_init_server_appeals():
    import sqlite3
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS server_appeals (
            code TEXT PRIMARY KEY,
            opener_id INTEGER,
            review_message_id INTEGER,
            decided_by INTEGER,
            investigate_channel_id INTEGER
        )
    """)
    con.commit()
    con.close()

@bot.event
async def on_ready():
    # 1) DB init
    try:
        db_init()
    except NameError:
        pass
    try:
        db_init_server_appeals()
    except NameError:
        pass
    try:
        migrate_server_appeals_table()
    except NameError:
        pass

    # 2) Persistent view'ları kaydet (restart sonrası butonlar çalışsın)
    try:
        bot.add_view(TicketView())       # Support ana menü
    except Exception as e:
        print("add_view TicketView error:", e)
    try:
        bot.add_view(OpenAppealView())   # Server Appeal ana menü
    except Exception as e:
        print("add_view OpenAppealView error:", e)

    # 3) Support: Moderation view restore
    try:
        import sqlite3
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("""
            SELECT ticket_code, opener_id, log_message_id
            FROM tickets
            WHERE decided_by IS NULL AND log_message_id IS NOT NULL
        """)
        rows = cur.fetchall()
        con.close()

        sup_ch = bot.get_channel(SUPPORT_CHANNEL_ID) or await bot.fetch_channel(SUPPORT_CHANNEL_ID)
        if sup_ch:
            restored = 0
            for ticket_code, opener_id, msg_id in rows:
                try:
                    msg = await sup_ch.fetch_message(msg_id)
                    await msg.edit(view=ModerationView(ticket_code=ticket_code, opener_id=opener_id, log_message=msg))
                    restored += 1
                except Exception:
                    pass
            print(f"🔁 Support restore: {restored} open ticket(s).")
        else:
            print("⚠️ SUPPORT_CHANNEL_ID çözülemedi; Support restore atlandı.")
    except Exception as e:
        print("Restore error (Support):", e)

    # 4) Server Appeal: Moderation view restore
    try:
        import sqlite3
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        # Sende tablo sütunları genelde id/opener_id/review_message_id
        cur.execute("""
            SELECT id, opener_id, review_message_id
            FROM server_appeals
            WHERE decided_by IS NULL AND review_message_id IS NOT NULL
        """)
        rows = cur.fetchall()
        con.close()

        app_ch = bot.get_channel(APPEAL_MOD_CHANNEL_ID) or await bot.fetch_channel(APPEAL_MOD_CHANNEL_ID)
        if app_ch:
            restored = 0
            for appeal_id, opener_id, msg_id in rows:
                try:
                    msg = await app_ch.fetch_message(msg_id)
                    # Dosyandaki GERÇEK sınıf adına göre ŞUNLARDAN BİRİNİ kullan:
                    await msg.edit(view=AppealModerationView(appeal_id=appeal_id, user_id=opener_id))
                    # Eğer sınıfın ServerAppealModerationView ise bunun yerine şunu kullan:
                    # await msg.edit(view=ServerAppealModerationView(sa_code=str(appeal_id), opener_id=opener_id, review_message=msg))
                    restored += 1
                except Exception:
                    pass
            print(f"🔁 Server Appeal restore: {restored} open appeal(s).")
        else:
            print("⚠️ APPEAL_MOD_CHANNEL_ID çözülemedi; Appeal restore atlandı.")
    except Exception as e:
        print("Restore error (Server Appeal):", e)

    print(f"✅ Logged in as {bot.user}")







bot.run(TOKEN)