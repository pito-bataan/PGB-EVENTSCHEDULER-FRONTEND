# 🔔 NOTIFICATION SYSTEM DEBUG GUIDE

## ✅ FIXES IMPLEMENTED

### 1. **Backend Socket.IO Room Joining Fix** (`server.ts`)
**Problem:** Users couldn't rejoin their Socket.IO room after page refresh
- Backend was blocking duplicate joins with: `⚠️ User already connected, skipping duplicate join`
- This prevented users from receiving notifications after reconnection

**Solution:**
- ✅ Allow users to reconnect and update their socket ID
- ✅ Always join the room even if user was previously connected
- ✅ Log reconnection events for debugging

**Expected Backend Logs:**
```
🔄 User 67abc123 reconnecting - updating socket ID from xyz to abc
✅ User 67abc123 is now in room user-67abc123
```

### 2. **Frontend Debug Logging** (`GlobalNotificationSystem.tsx` & `useSocket.ts`)
**Added comprehensive logging to track:**
- ✅ Socket.IO connection status
- ✅ User room joining
- ✅ Notification reception
- ✅ Notification display

**Expected Frontend Console Logs:**
```
🔗 [SOCKET] Connected to Socket.IO server
👤 [SOCKET] Joining user room for userId: 67abc123
✅ [NOTIFICATION] Setting up global notification listener for user: 67abc123
🔔 [NOTIFICATION] Received new notification: {eventId: "...", eventTitle: "..."}
✅ [NOTIFICATION] Showing new notification: global-event-67abc123
```

### 3. **Manual Refresh Button** (`Dashboard.tsx`)
**Added refresh button to notification dropdown:**
- ✅ Users can manually force reload notifications
- ✅ Helpful for debugging and immediate updates
- ✅ Located next to the close button in notification panel

---

## 🧪 HOW TO TEST

### **Step 1: Check Backend Connection**
1. Open backend terminal
2. Look for these logs when user logs in:
   ```
   🔌 User connected: [socket-id]
   👤 New user [userId] joining room
   ✅ User [userId] is now in room user-[userId]
   ```

### **Step 2: Check Frontend Connection**
1. Open browser DevTools Console (F12)
2. Look for these logs on Dashboard page:
   ```
   🔗 [SOCKET] Connected to Socket.IO server
   👤 [SOCKET] Joining user room for userId: [userId]
   ✅ [NOTIFICATION] Setting up global notification listener
   ```

### **Step 3: Create a Tagged Event**
1. Have User A create an event and tag User B's department
2. **Check Backend Logs:**
   ```
   🔄 Broadcasted new-notification event to all clients for event: [Event Title]
   ```
3. **Check User B's Browser Console:**
   ```
   🔔 [NOTIFICATION] Received new notification: {...}
   ✅ [NOTIFICATION] Showing new notification: global-event-...
   ```
4. **User B should see:**
   - ✅ Toast notification popup (bottom-right)
   - ✅ Red dot on bell icon
   - ✅ Notification in dropdown

### **Step 4: Test After Page Refresh**
1. User B refreshes the page while on Dashboard
2. **Check Backend Logs:**
   ```
   🔄 User [userId] reconnecting - updating socket ID
   ✅ User [userId] is now in room user-[userId]
   ```
3. **Check Frontend Console:**
   ```
   🔗 [SOCKET] Connected to Socket.IO server
   👤 [SOCKET] Joining user room after connection
   ```
4. Create another tagged event → User B should still receive notification ✅

---

## 🐛 TROUBLESHOOTING

### **Problem: No notifications appearing**

**Check 1: Is Socket.IO connected?**
```javascript
// In browser console:
// Should see: 🔗 [SOCKET] Connected to Socket.IO server
```
- ❌ If not connected: Check if backend is running on correct port
- ❌ Check VITE_SOCKET_URL in .env file

**Check 2: Is user in their room?**
```javascript
// In browser console:
// Should see: 👤 [SOCKET] Joining user room for userId: [userId]
```
- ❌ If not joining: Check if userId is valid (not "unknown")
- ❌ Check localStorage for 'userData'

**Check 3: Is backend emitting notifications?**
```bash
# In backend terminal:
# Should see: 🔔 Sent new-notification to user-[userId]
```
- ❌ If not emitting: Check if event has taggedDepartments
- ❌ Check if Socket.IO is initialized in server.ts

**Check 4: Is frontend receiving notifications?**
```javascript
// In browser console:
// Should see: 🔔 [NOTIFICATION] Received new notification
```
- ❌ If not receiving: User might not be in Socket.IO room
- ❌ Try manual refresh button in notification dropdown

---

## 🔍 COMMON ISSUES & SOLUTIONS

### Issue 1: "User already connected, skipping duplicate join"
**Status:** ✅ FIXED
- Backend now allows reconnections and updates socket ID

### Issue 2: Notifications work on fresh login but not after refresh
**Status:** ✅ FIXED
- Backend now properly handles reconnections
- Frontend logs show reconnection status

### Issue 3: Notifications not showing for tagged departments
**Check:**
1. Event must have `taggedDepartments` array with department names
2. User's department must match one of the tagged departments
3. Backend emits to ALL clients: `io.emit('new-notification', ...)`

### Issue 4: Notification popup shows but badge doesn't update
**This is a different system:**
- Popup = GlobalNotificationSystem (Socket.IO)
- Badge = Dashboard notification count (API polling every 30 seconds)
- Use manual refresh button to force badge update

---

## 📊 NOTIFICATION FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER A CREATES EVENT WITH TAGGED DEPARTMENTS             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND: Save event to database                          │
│    - Extract taggedDepartments                               │
│    - Get target users (event creator + tagged dept users)   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND: Emit Socket.IO events                           │
│    - io.to(`user-${userId}`).emit('new-notification', ...)  │
│    - io.emit('new-notification', ...) [for all clients]     │
│    - Console: 🔔 Sent new-notification to user-[userId]     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FRONTEND: GlobalNotificationSystem receives event        │
│    - Console: 🔔 [NOTIFICATION] Received new notification   │
│    - Check if already shown (prevent duplicates)            │
│    - Play notification sound                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FRONTEND: Show toast notification                        │
│    - Console: ✅ [NOTIFICATION] Showing new notification    │
│    - Display animated toast (bottom-right)                  │
│    - Auto-dismiss after 5 seconds                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. FRONTEND: Update Dashboard (30-second polling)           │
│    - Fetch latest notifications from API                    │
│    - Update badge count                                     │
│    - Show in notification dropdown                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

1. **Restart Backend Server**
   ```bash
   cd PGB-EVENTSCHEDULER-BACKEND
   npm run dev
   ```

2. **Clear Browser Cache & Reload Frontend**
   - Press Ctrl+Shift+R (hard reload)
   - Or clear cache in DevTools

3. **Test Notification Flow**
   - Follow "Step 3: Create a Tagged Event" above
   - Monitor both backend terminal and browser console

4. **If Still Not Working:**
   - Share backend terminal logs
   - Share browser console logs
   - Check if VITE_SOCKET_URL matches backend URL

---

## 📝 FILES MODIFIED

### Backend:
- ✅ `server.ts` - Fixed Socket.IO room joining logic

### Frontend:
- ✅ `src/components/GlobalNotificationSystem.tsx` - Added debug logging
- ✅ `src/hooks/useSocket.ts` - Added connection status logging
- ✅ `src/components/Users/Dashboard.tsx` - Added manual refresh button

---

## 💡 TIPS

1. **Keep Console Open:** Always have browser DevTools open when testing
2. **Check Both Sides:** Monitor both backend terminal and frontend console
3. **Use Manual Refresh:** Click refresh button in notification dropdown if needed
4. **Test Reconnection:** Refresh page and verify user rejoins Socket.IO room
5. **Check User Data:** Verify `localStorage.getItem('userData')` has valid department

---

**Last Updated:** 2025-01-18
**Status:** ✅ Ready for Testing
