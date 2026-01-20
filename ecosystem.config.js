module.exports = {
  apps: [
    {
      name: "aila-frontend",
      cwd: "./aila_frontend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "aila-backend",
      cwd: "./aila_backend",
      script: "python3",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      interpreter: "python3"
    }
  ]
};

