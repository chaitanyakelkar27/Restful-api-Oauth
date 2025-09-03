# 🚀 **PRESENTATION SETUP GUIDE**

## ⚡ **Quick Setup (Do this BEFORE your presentation)**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Create .env File**
Create a file named `.env` in the FSD_Presentation folder with:
```env
MONGO_URI=mongodb://localhost:27017/fsd_presentation
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
PORT=5000
NODE_ENV=development
```

### **3. Install nodemon (for development)**
```bash
npm install --save-dev nodemon
```

### **4. Test Run**
```bash
npm start
```
You should see: `✅ Server running on port 5000` and `✅ MongoDB Connected`

---

## 🎯 **PRESENTATION DAY CHECKLIST**

### **Before Starting:**
- [ ] MongoDB is running locally
- [ ] .env file is created
- [ ] Dependencies are installed
- [ ] Server starts without errors
- [ ] Have Postman or curl ready for API testing

### **Backup Plan:**
- [ ] Screenshots of working API responses
- [ ] MongoDB connection string ready
- [ ] Alternative port if 5000 is busy

---

## 🔧 **Troubleshooting Common Issues**

### **MongoDB Connection Error:**
- Make sure MongoDB is running: `mongod`
- Check if MongoDB is installed
- Verify connection string in .env

### **Port Already in Use:**
- Change PORT in .env to 3000, 8000, or 8080
- Kill process using port: `npx kill-port 5000`

### **Module Not Found:**
- Run `npm install` again
- Check if node_modules folder exists

---

## 📱 **Alternative Testing Methods**

### **If curl doesn't work, use Postman:**
1. Import these requests:
   - GET http://localhost:5000/
   - POST http://localhost:5000/api/v1/auth/register
   - POST http://localhost:5000/api/v1/auth/login
   - GET http://localhost:5000/api/v1/notes

### **Or use browser:**
- Navigate to http://localhost:5000/ for health check

---

## ⏰ **Timing Breakdown (Total: 20-25 minutes)**

- **Introduction:** 2-3 min
- **Project Overview:** 3-4 min
- **Live Demo:** 5-6 min
- **Security Features:** 3-4 min
- **Code Walkthrough:** 4-5 min
- **Learning Objectives:** 2-3 min
- **Extensions:** 2-3 min
- **Q&A:** 3-4 min
- **Conclusion:** 1-2 min

**Good luck with your presentation! 🎉**
