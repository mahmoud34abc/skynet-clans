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

module.exports = {
    doesFolderOrFileExist,
    getFileSize,
    removeFile,
    makeFolder,
    removeFolder,
    openWriteStream
}