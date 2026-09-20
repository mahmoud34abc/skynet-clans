const fs = require('fs');

function doesFolderOrFileExist(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        console.error(`Error checking if file exists: ${err}`);
        return false;
    }
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (err) {
        console.error(`Error getting file size: ${err}`);
        return 1;
    }
}

function removeFile(filePath, callback) {
    try {
        fs.unlinkSync(filePath);
        //console.log(`File ${filePath} deleted successfully`);
        if (callback) callback();
    } catch (err) {
        console.error(`Error removing file: ${err}`);
        if (callback) callback(err);
    }
}

function makeFolder(filePath, options) {
    try {
        fs.mkdirSync(filePath, options);
        //console.log(`Folder ${filePath} created successfully`);
    } catch (err) {
        console.error(`Error creating folder: ${err}`);
    }
}

function removeFolder(filePath, callback) {
    try {
        fs.rmSync(filePath, { recursive: true });
        //console.log(`Folder ${filePath} deleted successfully`);
        if (callback) callback();
    } catch (err) {
        console.error(`Error removing folder: ${err}`);
        if (callback) callback(err);
    }
}

function openWriteStream(filePath) {
    try {
        return fs.createWriteStream(filePath);
    } catch (err) {
        console.error(`Error creating write stream: ${err}`);
    }
}

async function promiseAccess(filePath, mode) {
    try {
        await fs.promises.access(filePath, fs.constants[mode])
        return filePath;
    } catch(err) {
        console.warn(`Error while accessing path ${filePath}: ${err}`)
        return null;
    }
}

module.exports = {
    doesFolderOrFileExist,
    getFileSize,
    
    openWriteStream,
    removeFile,

    makeFolder,
    removeFolder,
    
    promiseAccess
}