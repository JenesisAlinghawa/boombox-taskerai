const http = require("http");

const testData = {
  totalTasks: 10,
  completedTasks: 7,
  completionRate: 70,
  overdueTasks: 1,
  members: [],
  avgTasksPerMember: 3.5,
  tasks: [],
};

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/analytics/ai",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(JSON.stringify(testData)),
  },
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response:", data);
    try {
      const parsed = JSON.parse(data);
      console.log("\nParsed Response:");
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Could not parse as JSON");
    }
  });
});

req.on("error", (error) => {
  console.error("Error:", error.message);
});

req.write(JSON.stringify(testData));
req.end();

console.log("Sending test request to http://localhost:3000/api/analytics/ai");
