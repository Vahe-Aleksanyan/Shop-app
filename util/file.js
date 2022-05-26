const fs = require('fs');
// deleting file based on given path. don't forget to export to use in other packages
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => { // remove a file or symbolic link from the filesystem.
    if (err) {
      throw (err);
    }
  });
}

exports.deleteFile = deleteFile;