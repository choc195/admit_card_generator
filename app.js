const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const app = express();
const axios = require("axios");
const ejs = require("ejs");
const pdf = require("html-pdf");

const port = 3001;

let formData = null; // Temporary storage to hold the form data

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Set EJS as the templating engine
app.set("view engine", "ejs"); // Ensure EJS is set as the view engine
// app.set('views', path.join(__dirname, 'views'));  // Ensure the views directory is set correctly
app.use("/views", express.static(path.join(__dirname, "views")));

// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://starcaptain25:SO0lnk4kD5PDmKDY@powerwebdata.a18cs.mongodb.net/?retryWrites=true&w=majority&appName=PowerWebData",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Multer setup for file uploads

// Routes
// app.get('/', (req, res) => {
//   res.render('template'); // EJS template
// });

// app.get('/download-template', (req, res) => {
//   // Render the EJS template to HTML
//   ejs.renderFile(path.join(__dirname, 'views', 'template.ejs'), {}, (err, html) => {
//     if (err) {
//       console.error('Error rendering template:', err);
//       return res.status(500).send('Error generating template');
//     }

//     // PDF options
//     const options = {
//       format: 'A4',
//       border: {
//         top: '10mm',
//         right: '10mm',
//         bottom: '10mm',
//         left: '10mm'
//       }
//     };

//     // Create PDF from HTML
//     pdf.create(html, options).toBuffer((err, buffer) => {
//       if (err) {
//         console.error('Error generating PDF:', err);
//         return res.status(500).send('Error generating PDF');
//       }

//       // Set PDF headers and send
//       res.setHeader('Content-Type', 'application/pdf');
//       res.setHeader('Content-Disposition', 'attachment; filename=template.pdf');
//       res.send(buffer);
//     });
//   });
// });

app.get("/download-template", (req, res) => {
  if (!formData) {
    return res.status(400).send("No form data available to generate the PDF");
  }

  const {
    name,
    enrollment,
    father,
    mother,
    roll,
    semester,
    exam,
    course,
    subjects,
  } = formData;

  // Same calculation logic for total values (Max Marks, Obtained Marks, etc.)

  const subjectList = Array.isArray(subjects)
    ? subjects
    : Object.values(subjects);

  // Similar to what was done in /generate-result route
  let totalMax = 0;
  let totalObtained = 0;
  let totalCredits = 0;
  let totalCreditPoints = 0;
  let totalGradePoints = 0;
  let hasFailed = false;

  for (const subj of subjectList) {
    const maxMarks = parseFloat(subj.maxMarks);
    const obtained = parseFloat(subj.obtained);
    const credit = parseFloat(subj.credits);
    const creditPoint = parseFloat(subj.creditPoint);
    const gradepoint = parseFloat(subj.gradePoint);

    totalMax += maxMarks;
    totalObtained += obtained;
    totalCredits += credit;
    totalCreditPoints += creditPoint;
    totalGradePoints += gradepoint;

    // Check if subject is failed (below 40% or grade point 0)
    if ((obtained / maxMarks) * 100 < 40 || gradepoint === 0) {
      hasFailed = true;
    }
  }

  const result = hasFailed ? "Fail" : "Pass";
  const sgpa =
    totalCredits > 0 ? (totalCreditPoints / totalCredits).toFixed(2) : "0.00";

  // Render PDF and send as response
  ejs.renderFile(
    path.join(__dirname, "/views/template.ejs"),
    {
      name,
      enrollment,
      father,
      mother,
      roll,
      semester,
      exam,
      course,
      result,
      subjects,
      totalMax,
      totalObtained,
      totalCredits,
      totalGradePoints,
      totalCreditPoints,
      sgpa,
      isPDF: false,
    },
    (err, html) => {
      if (err) {
        console.error("Error rendering template:", err);
        return res.status(500).send("Error generating template");
      }

      pdf.create(html, { format: "A4" }).toBuffer((err, buffer) => {
        if (err) {
          console.error("Error generating PDF:", err);
          return res.status(500).send("Error generating PDF");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=result-report.pdf"
        );
        res.send(buffer);
      });
    }
  );
});

app.get("/", (req, res) => {
  res.render("form");
});

// app.post('/generate-result', (req, res) => {
//   const data = req.body;
//   res.render('template', data);
// });

app.post("/generate", (req, res) => {
  const {
    name,
    enrollment,
    father,
    mother,
    roll,
    semester,
    exam,
    course,
    subjects, // Assume this is an array of subjects with details
    result,
    sgpa,
  } = req.body;

  res.render("template", {
    name,
    enrollment,
    father,
    mother,
    roll,
    semester,
    exam,
    course,
    subjects,
    result,
    sgpa,
  });
});

app.post("/generate-result", (req, res) => {
  formData = req.body; // Store the form data temporarily in the variable
  const {
    name,
    enrollment,
    father,
    mother,
    roll,
    semester,
    exam,
    course,
    subjects, // this will be an array of subject objects
  } = req.body;

  // Make sure subjects is an array
  const subjectList = Array.isArray(subjects)
    ? subjects
    : Object.values(subjects);

  let totalMax = 0;
  let totalObtained = 0;
  let totalCredits = 0;
  let totalCreditPoints = 0;
  let totalGradePoints = 0;
  let hasFailed = false;

  for (const subj of subjectList) {
    const maxMarks = parseFloat(subj.maxMarks);
    const obtained = parseFloat(subj.obtained);
    const credit = parseFloat(subj.credits);
    const creditPoint = parseFloat(subj.creditPoint);
    const gradepoint = parseFloat(subj.gradePoint);

    totalMax += maxMarks;
    totalObtained += obtained;
    totalCredits += credit;
    totalCreditPoints += creditPoint;
    totalGradePoints += gradepoint;

    // Check if subject is failed (below 40% or grade point 0)
    if ((obtained / maxMarks) * 100 < 40 || gradepoint === 0) {
      hasFailed = true;
    }
  }

  const result = hasFailed ? "Fail" : "Pass";
  // console.log("Result Status:", resultStatus);

  const sgpa =
    totalCredits > 0 ? (totalCreditPoints / totalCredits).toFixed(2) : 0;

  res.render("template", {
    name,
    enrollment,
    father,
    mother,
    roll,
    semester,
    exam,
    course,
    result,
    subjects: subjectList,
    totalMax,
    totalObtained,
    totalCredits,
    totalGradePoints,
    totalCreditPoints,
    sgpa,
    isPDF: true,
  });
});

// app.post('/generate-result', (req, res) => {
//   formData = req.body; // Store the form data temporarily in the variable

//   const { name, enrollment, father, mother, roll, semester, exam, course, subjects } = formData;

//   // Calculate total values (Max Marks, Obtained Marks, Grade Points, etc.)
//   let totalMax = 0;
//   let totalObtained = 0;
//   let totalCredits = 0;
//   let totalGradePoints = 0;
//   let totalCreditPoints = 0;

//   subjects.forEach((subj) => {
//     totalMax += parseFloat(subj.maxMarks);
//     totalObtained += parseFloat(subj.obtained);
//     totalCredits += parseFloat(subj.credits);
//     totalCreditPoints += parseFloat(subj.creditPoint);
//     totalGradePoints += parseFloat(subj.gradePoint);
//   });

//   // Calculate SGPA (if applicable)
//   const sgpa = (totalCredits > 0) ? (totalCreditPoints / totalCredits).toFixed(2) : "0.00";

//   // Render the result template with form data
//   ejs.renderFile(path.join(__dirname, 'template.ejs'), {
//     name, enrollment, father, mother, roll, semester, exam, course,
//     subjects, totalMax, totalObtained, totalCredits, totalGradePoints, totalCreditPoints, sgpa
//   }, (err, html) => {
//     if (err) {
//       console.error('Error rendering template:', err);
//       return res.status(500).send('Error generating template');
//     }

//     // Generate PDF from HTML
//     const options = {
//       format: 'A4',
//       border: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
//     };

//     pdf.create(html, options).toBuffer((err, buffer) => {
//       if (err) {
//         console.error('Error generating PDF:', err);
//         return res.status(500).send('Error generating PDF');
//       }

//       // Send the generated PDF as the response
//       res.setHeader('Content-Type', 'application/pdf');
//       res.setHeader('Content-Disposition', 'attachment; filename=result-report.pdf');
//       res.send(buffer);
//     });
//   });
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
