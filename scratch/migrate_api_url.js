const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../Frontend/src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = getAllFiles(srcDir);
const oldUrl = 'http://localhost:5000/api';
const replacement = 'import.meta.env.VITE_API_URL || "http://localhost:5000/api"';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(oldUrl)) {
    console.log(`Updating ${file}`);
    // Replace hardcoded URLs with env variable
    // We handle both 'http://localhost:5000/api' and `http://localhost:5000/api`
    content = content.replace(/'http:\/\/localhost:5000\/api'/g, replacement);
    content = content.replace(/`http:\/\/localhost:5000\/api/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}');
    fs.writeFileSync(file, content);
  }
});
