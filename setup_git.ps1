# PowerShell script to initialize git and push to GitHub repository

# Initialize git repository
git init

# Add all files (excluding those in .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit - MomsCare AI maternal health platform"

# Add the remote repository
git remote add origin https://github.com/dev-fuadhasan/buildathon.git

# Push to GitHub
git branch -M main
git push -u origin main

Write-Host "Repository has been initialized and pushed to GitHub!"
Write-Host "Remember to add your environment variables to GitHub Secrets if needed."