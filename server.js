const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const multer = require('multer');
//const upload = multer({ dest: 'temp_uploads/' });
const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = path.join(projectsDir, req.params.project);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });
const projectsDir = path.join(__dirname, 'projects');
if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log(projectsDir)
// List all projects

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/projects', (req, res) => {
  fs.readdir(projectsDir, { withFileTypes: true }, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read projects' });
    const folders = files.filter(f => f.isDirectory()).map(f => f.name);
    res.json({ projects: folders });
  });
});

// Load a project
app.get('/load/:project', (req, res) => {
  const file = path.join(projectsDir, req.params.project, 'document.tex');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Error reading file' });
    res.json({ content: data });
  });
});

// Create a new project
app.post('/create/:project', (req, res) => {
  const folder = path.join(projectsDir, req.params.project);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
  const texFile = path.join(folder, 'document.tex');
  const defaultTex = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
Hello from Overleaf clone!

\\[
e^{i\\pi} + 1 = 0
\\]

\\end{document}`;
  fs.writeFile(texFile, defaultTex, err => {
    if (err) return res.status(500).json({ error: 'Failed to create file' });
    res.json({ content: defaultTex });
  });
});

app.post('/upload/:project', upload.array('files'), (req, res) => {
  res.json({ message: 'Files uploaded successfully' });
});



// Save and compile
app.post('/save/:project', (req, res) => {
  const folder = path.join(projectsDir, req.params.project);
  const texFile = path.join(folder, 'document.tex');
  const pdfFile = path.join(folder, 'document.pdf');
  fs.writeFile(texFile, req.body.content, err => {
    if (err) return res.status(500).json({ error: 'Save failed' });

    // Compile to PDF
    exec(`pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${folder} ${texFile}`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).send(stderr || stdout || 'Compilation error');
      }
      res.json({ message: 'Compiled successfully' });
    });
  });
});

// Serve PDF
app.get('/pdf/:project', (req, res) => {
  const pdfFile = path.join(projectsDir, req.params.project, 'document.pdf');
  if (!fs.existsSync(pdfFile)) return res.status(404).send('PDF not found');
  res.sendFile(pdfFile);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get('/files/:project', (req, res) => {
  const folder = path.join(projectsDir, req.params.project);
  if (!fs.existsSync(folder)) return res.status(404).json({ error: 'Project not found' });

  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list files' });
    res.json({ files });
  });
});
