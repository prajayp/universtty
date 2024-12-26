import express from 'express';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
import bodyParser from 'body-parser';
import session from 'express-session';
import { fileURLToPath } from 'url'; // Import the required module
import fetch, { Headers } from 'node-fetch'; // Import fetch and Headers
import axios from 'axios'; 

// Make fetch and Headers globally available
globalThis.fetch = fetch;
globalThis.Headers = Headers;

// Dynamically import GoogleGenerativeAI to ensure compatibility
const GoogleGenerativeAI = await import('@google/generative-ai').then(module => module.GoogleGenerativeAI);

// Get the directory name from the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Use this for the directory path

// Initialize Express app
const app = express();
const port = 3000;

// Initialize gemini models
const genAI = new GoogleGenerativeAI("AIzaSyB2J83cNPtfjUR_sf-rtjBENEb133ooeNQ");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// PostgreSQL client configuration
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'amrita_chat_system',
  password: 'marchipoyanu',
  port: 5433, // Update port if needed
});

// Connect to the PostgreSQL database
async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Failed to connect to database:', err.stack);
  }
}

async function runQuery(query) {
  try {
    const result = await client.query(query); // Executes the query
    console.log('Query result:', result.rows); // Logs the result rows
    return result.rows; // Return the result rows
  } catch (err) {
    console.error('Error executing query:', err.stack);
    throw err; // Propagate the error
  }
}



// Session management configuration
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Routes
app.get('/', (req, res) => {
  res.render('index'); // Render the login page
});

app.get('/dashboard', (req, res) => {
  // Check if the user is authenticated
  if (!req.session.rollNumber) {
    return res.redirect('/'); // If not, redirect to login
  }
  res.render('dashboard', { username: req.session.username }); // Pass the session data to the dashboard
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simple authentication logic (replace with proper authentication in production)
  if (username === 'admin' && password === 'password') {
    const currentDate = new Date().toLocaleString();
    
    // For simplicity, we use a mock roll number for this user
    const rollNumber = '123456'; // This should come from the database
    req.session.username = username;  // Store username in session
    req.session.rollNumber = rollNumber; // Store roll number in session
    res.render('dashboard', { username, currentDate }); // Pass data to the dashboard
  } else {
    res.redirect('/'); // Redirect back to login on failure
  }
});

// Route to render the chat form page
app.get('/chat', (req, res) => {
  res.render('chat', { queryResult: null, error: null });
});

// Route to handle form submission
app.post('/chat', async (req, res) => {
  const userQuery = req.body.query;

  if (!userQuery) {
    return res.render('chat', { queryResult: null, error: 'Query cannot be empty' });
  }

  var fixed_prompt = `CREATE TABLE Students (
    StudentID VARCHAR(20) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Department VARCHAR(50) NOT NULL,
    AdmissionYear INT NOT NULL
);

CREATE TABLE Courses (
    CourseID VARCHAR(20) PRIMARY KEY,
    CourseName VARCHAR(100) NOT NULL,
    Department VARCHAR(50) NOT NULL,
    Credits INT NOT NULL CHECK (Credits > 0)
);


-- Create CourseRegistration Table
CREATE TABLE CourseRegistration (
    RegistrationID VARCHAR(20) PRIMARY KEY,
    StudentID VARCHAR(20),  -- Match the type with Students.StudentID
    CourseID VARCHAR(20),   -- Match the type with Courses.CourseID
    SemesterNumber INT NOT NULL,
    RegistrationDate DATE NOT NULL,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID)
);

DROP table FeeDetails;

CREATE TABLE FeeDetails (
    FeeID VARCHAR(20) PRIMARY KEY,
    StudentID VARCHAR(20) NOT NULL,  -- Match the type with Students.StudentID
    SemesterNumber INT NOT NULL CHECK (SemesterNumber BETWEEN 1 AND 8),
    FeeAmount DECIMAL(10, 2) NOT NULL,
    FeeStatus VARCHAR(20) NOT NULL CHECK (FeeStatus IN ('Paid', 'Pending')),
    PaymentDate DATE,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE
);

CREATE TABLE Grades (
    StudentID VARCHAR(20) NOT NULL, -- Match the type with Students.StudentID
    CourseID VARCHAR(20) NOT NULL, -- Match the type with Courses.CourseID
    SemesterNumber INT NOT NULL CHECK (SemesterNumber BETWEEN 1 AND 8),
    Grade CHAR(2) NOT NULL CHECK (Grade IN ('A+', 'A', 'B+', 'B', 'C', 'D', 'F')),
    PRIMARY KEY (StudentID, CourseID, SemesterNumber),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID) ON DELETE CASCADE
);


CREATE TABLE Attendance (
    StudentID VARCHAR(20) NOT NULL, -- Match the type with Students.StudentID
    CourseID VARCHAR(20) NOT NULL, -- Match the type with Courses.CourseID
    SemesterNumber INT NOT NULL CHECK (SemesterNumber BETWEEN 1 AND 8),
    AttendancePercentage DECIMAL(5, 2) NOT NULL CHECK (AttendancePercentage BETWEEN 0 AND 100), -- Percentage must be between 0 and 100
    PRIMARY KEY (StudentID, CourseID, SemesterNumber),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID) ON DELETE CASCADE
);
this is my schema

give me only the sql query in a single line for my questions.
if we cat retrieve the data just mention 
"cannot create"

Query:

`

  console.log(userQuery);
  try {
    var prompt = fixed_prompt + userQuery;
    var result = await model.generateContent(prompt);
    var query = result.response.text().replace(/`/g, '').replace('sql', '').replace('\n', '');
    console.log(query);
    
    // Handle the response
    // console.log('Gemini Response:', response.data);
    // Example of calling the functions
    if (query.toLowerCase().startsWith('select')) {
      const queryResult = await runQuery(query); // Assuming runQuery executes the SQL query
      var result_prompt = "My output is " + JSON.stringify(queryResult) +  " make it into human readable form"
      var result_result = await model.generateContent(result_prompt);
      var result_clean = result_result.response.text().replace(/`/g, '');
      console.log(result_prompt);
      console.log(result_clean);
      return res.render('chat', { queryResult: result_clean, error: null});  // Return the response only once
    } else {
      return res.render('chat', { queryResult: 'Cannot execute this query', error: null }); // Handle non-SELECT queries
    }
  } catch (error) {
    console.error('Errorrrrrrrrrrr: ', error);
    res.render('chat', { queryResult: null, error: 'An error occurred while processing your query.' });
  }
});

// Chatbot route (for user queries)
app.post('/ask', async (req, res) => {
  const userQuestion = req.body.question;
  const rollNumber = req.session.rollNumber;

  if (!rollNumber) {
    return res.status(401).json({ error: 'User is not authenticated' }); // If not logged in
  }

  if (!userQuestion) {
    return res.status(400).json({ error: 'No question provided' }); // If no question provided
  }

  try {
    // Query the database using the student's roll number
    const query = `
      SELECT * FROM students 
      WHERE roll_number = $1 AND (name LIKE $2 OR department LIKE $2);
    `;
    const queryParams = [rollNumber, `%${userQuestion}%`];
    const queryResult = await client.query(query, queryParams);

    if (queryResult.rows.length > 0) {
      const studentData = queryResult.rows[0];
      const responseText = `
        Here is the information I found for your query:
        Name: ${studentData.name}, 
        Department: ${studentData.department}, 
        Email: ${studentData.email}
      `;
      return res.json({ answer: responseText });
    } else {
      return res.json({ answer: 'Sorry, I could not find the information you are looking for.' });
    }
  } catch (error) {
    console.error('Error querying database:', error);
    return res.status(500).json({ error: 'Error fetching from database' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:3000`);
  connectToDatabase(); // Connect to PostgreSQL when server starts
});