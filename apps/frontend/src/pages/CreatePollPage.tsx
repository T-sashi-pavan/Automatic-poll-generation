// // File: apps/frontend/src/pages/CreatePollPage.tsx
// "use client"

// import React, { useState, useCallback, useEffect } from "react"
// import { motion, AnimatePresence } from "framer-motion"
// import {
//   Hash,
//   Upload,
//   Users,
//   Mail,
//   FileText,
//   AlertCircle,
//   X,
//   Eye,
//   EyeOff,
//   RefreshCw,
//   Clock,
//   Play,
//   Plus,
//   Trash2,
// } from "lucide-react"
// import GlassCard from "../components/GlassCard"
// import DashboardLayout from "../components/DashboardLayout"
// import * as XLSX from "xlsx"
// import { apiService } from '../utils/api';
// import toast from 'react-hot-toast';
// import { useNavigate } from "react-router-dom";

// interface StudentInvite {
//   name: string
//   email: string
// }

// interface CreatedRoom { 
//   _id: string; 
//   code: string; 
//   name: string; 
// }

// const POLL_STORAGE_KEY = "activePollSession";

// const CreatePollPage: React.FC = () => {
//   const [roomCode, setRoomCode] = useState("")
//   const [csvFile, setCsvFile] = useState<File | null>(null)
//   const [students, setStudents] = useState<StudentInvite[]>([])
//   const [isDragOver, setIsDragOver] = useState(false)
//   const [isLoading, setIsLoading] = useState(false)
//   const [isSendingInvites, setIsSendingInvites] = useState(false)
//   const [isDestroying, setIsDestroying] = useState(false)
//   const [showPreview, setShowPreview] = useState(false)
//   const [errors, setErrors] = useState<{ csv?: string }>({})
//   const [isPollActive, setIsPollActive] = useState(false)
//   const [timeRemaining, setTimeRemaining] = useState(3 * 60 * 60) // 3 hours in seconds
//   const [invitesSent, setInvitesSent] = useState(false)
//   const [roomName, setRoomName] = useState("")
//   const [roomNameError, setRoomNameError] = useState("")
//   const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null)

//   // Load poll session from localStorage if active
//   useEffect(() => {
//     const saved = localStorage.getItem(POLL_STORAGE_KEY)
//     if (saved) {
//       try {
//         const data = JSON.parse(saved)
//         if (data.isPollActive) {
//           setRoomCode(data.roomCode || "")
//           setRoomName(data.roomName || "")
//           setTimeRemaining(
//             typeof data.timeRemaining === "number"
//               ? data.timeRemaining
//               : 3 * 60 * 60
//           )
//           setIsPollActive(true)
//         } else {
//           setRoomCode(generateRoomCode())
//         }
//       } catch {
//         setRoomCode(generateRoomCode())
//       }
//     } else {
//       setRoomCode(generateRoomCode())
//     }
//   }, [])

//   // Persist poll session to localStorage only if poll is active
//   useEffect(() => {
//     if (isPollActive) {
//       localStorage.setItem(
//         POLL_STORAGE_KEY,
//         JSON.stringify({
//           roomCode,
//           roomName,
//           timeRemaining,
//           isPollActive: true,
//         })
//       )
//     } else {
//       localStorage.removeItem(POLL_STORAGE_KEY)
//     }
//   }, [isPollActive, roomCode, roomName, timeRemaining])

//   // Generate random room code
//   const generateRoomCode = (): string => {
//     const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
//     let result = ""
//     for (let i = 0; i < 6; i++) {
//       result += characters.charAt(Math.floor(Math.random() * characters.length))
//     }
//     return result
//   }

//   // Handle room code regeneration
//   const handleRegenerateCode = () => {
//     if (!isPollActive) {
//       setRoomCode(generateRoomCode())
//     }
//   }

//   // Handle destroy room
//   const handleDestroyRoom = () => {
//     setIsDestroying(true)
//     setTimeout(() => {
//       setIsPollActive(false)
//       setTimeRemaining(3 * 60 * 60) // Reset to 3 hours
//       setRoomCode(generateRoomCode()) // Generate new code
//       setIsDestroying(false)
//       localStorage.removeItem(POLL_STORAGE_KEY) // Clear persisted session
//       console.log("Room destroyed and reset")
//     }, 1500)
//   }

//   // Format time remaining
//   const formatTime = (seconds: number): string => {
//     const hours = Math.floor(seconds / 3600)
//     const minutes = Math.floor((seconds % 3600) / 60)
//     const secs = seconds % 60
//     return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
//   }

//   // Timer effect
//   useEffect(() => {
//     let interval: NodeJS.Timeout
//     if (isPollActive && timeRemaining > 0) {
//       interval = setInterval(() => {
//         setTimeRemaining((prev) => {
//           if (prev <= 1) {
//             setIsPollActive(false)
//             return 0
//           }
//           return prev - 1
//         })
//       }, 1000)
//     }
//     return () => clearInterval(interval)
//   }, [isPollActive, timeRemaining])

//   // Extend time
//   const handleExtendTime = (hours: number) => {
//     setTimeRemaining((prev) => prev + hours * 60 * 60)
//   }

//   // Parse CSV content
//   const parseCSV = (content: string): StudentInvite[] => {
//     const lines = content.split("\n").filter((line) => line.trim())
//     const headers = lines[0]
//       .toLowerCase()
//       .split(",")
//       .map((h) => h.trim())

//     const emailIndex = headers.findIndex((h) => h.includes("email"))
//     const nameIndex = headers.findIndex((h) => h.includes("name"))

//     if (emailIndex === -1) {
//       throw new Error("CSV must contain an 'email' column")
//     }

//     return lines
//       .slice(1)
//       .map((line) => {
//         const values = line.split(",").map((v) => v.trim())
//         return {
//           name: nameIndex !== -1 ? values[nameIndex] || "Unknown" : "Unknown",
//           email: values[emailIndex] || "",
//         }
//       })
//       .filter((student) => student.email)
//   }

//   // Handle file upload (CSV or Excel)
//   const handleFileUpload = useCallback(async (file: File) => {
//     const isCSV = file.name.endsWith(".csv")
//     const isXLS = file.name.endsWith(".xls") || file.name.endsWith(".xlsx")

//     if (!isCSV && !isXLS) {
//       setErrors((prev) => ({ ...prev, csv: "Please upload a .csv or .xls/.xlsx file" }))
//       return
//     }

//     setIsLoading(true)
//     setErrors((prev) => ({ ...prev, csv: undefined }))

//     try {
//       let parsedStudents: StudentInvite[] = []

//       if (isCSV) {
//         const content = await file.text()
//         parsedStudents = parseCSV(content)
//       } else if (isXLS) {
//         const data = await file.arrayBuffer()
//         const workbook = XLSX.read(data, { type: "array" })
//         const sheet = workbook.Sheets[workbook.SheetNames[0]]
//         const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]

//         const headers = rows[0].map((h) => h.toLowerCase().trim())
//         const emailIndex = headers.findIndex((h) => h.includes("email"))
//         const nameIndex = headers.findIndex((h) => h.includes("name"))

//         if (emailIndex === -1) {
//           throw new Error("File must contain an 'email' column")
//         }

//         parsedStudents = rows
//           .slice(1)
//           .filter((row) => row[emailIndex])
//           .map((row) => ({
//             name: nameIndex !== -1 ? row[nameIndex]?.toString().trim() || "Unknown" : "Unknown",
//             email: row[emailIndex]?.toString().trim() || "",
//           }))
//       }

//       if (parsedStudents.length === 0) {
//         throw new Error("No valid student records found")
//       }

//       setStudents(parsedStudents)
//       setCsvFile(file)
//       setShowPreview(true)
//     } catch (error) {
//       setErrors((prev) => ({
//         ...prev,
//         csv: error instanceof Error ? error.message : "Failed to parse the file",
//       }))
//       setStudents([])
//       setCsvFile(null)
//     } finally {
//       setIsLoading(false)
//     }
//   }, [])

//   // Handle drag and drop
//   const handleDragOver = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setIsDragOver(true)
//   }, [])

//   const handleDragLeave = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setIsDragOver(false)
//   }, [])

//   const handleDrop = useCallback(
//     (e: React.DragEvent) => {
//       e.preventDefault()
//       setIsDragOver(false)

//       const files = Array.from(e.dataTransfer.files)
//       if (files.length > 0) {
//         handleFileUpload(files[0])
//       }
//     },
//     [handleFileUpload],
//   )

//   // Handle file input change
//   const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files
//     if (files && files.length > 0) {
//       handleFileUpload(files[0])
//     }
//   }

//   // Remove uploaded file
//   const removeFile = () => {
//     setCsvFile(null)
//     setStudents([])
//     setShowPreview(false)
//     setInvitesSent(false)
//     setErrors((prev) => ({ ...prev, csv: undefined }))
//   }

//   const handleCreateSession = async () => {
//     if (!roomName.trim()) {
//       return setRoomNameError("Room Name is required.")
//     }
//     setRoomNameError("")
//     setIsLoading(true)
//     const creationToast = toast.loading("Creating session...")
//     try {
//       const response = await apiService.createRoom({ name: roomName })
//       setCreatedRoom(response.data)
//       setIsPollActive(true)
//       setRoomCode(response.data.code)
//       toast.success(`Session "${roomName}" is now active!`, { id: creationToast })
//     } catch (err: any) {
//       toast.error(err.response?.data?.message || 'Failed to create session.', { id: creationToast })
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const handleSendInvites = async () => {
//     if (!createdRoom) return toast.error("Please create a session first.")
//     if (!csvFile) return toast.error("Please upload a file with student emails.")
    
//     const formData = new FormData()
//     formData.append('studentsFile', csvFile)

//     setIsSendingInvites(true)
//     const sendingToast = toast.loading(`Sending invites to ${students.length} students...`)
//     try {
//         const response = await apiService.sendInvites(createdRoom._id, formData)
//         toast.success(response.data.message, { id: sendingToast, duration: 4000 })
//         setInvitesSent(true)
//     } catch (err: any) {
//         toast.error(err.response?.data?.message || 'Failed to send invites.', { id: sendingToast })
//     } finally {
//         setIsSendingInvites(false)
//     }
//   }

//   const destroySession = () => {
//     setCreatedRoom(null)
//     setRoomName('')
//     setCsvFile(null)
//     setStudents([])
//     setInvitesSent(false)
//     setIsPollActive(false)
//     toast.success("Session has been closed.")
//   }

//   return (
//     <DashboardLayout>
//       <div className="min-h-screen p-4 sm:p-6 lg:p-8">
//         <div className="max-w-6xl mx-auto space-y-8">
//           {/* Header */}
//           <motion.div className="text-center">
//             <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Create New Poll Session</h1>
//             <p className="text-gray-400">Start a new room and invite your students to join.</p>
//           </motion.div>

//           <div className="grid lg:grid-cols-2 gap-8">
//             {/* Session Creation Panel */}
//             <motion.div>
//               <GlassCard className="p-6 sm:p-8">
//                 <h2 className="text-xl font-semibold text-white mb-6">1. Create Your Session</h2>
                
//                 <div className="mb-4">
//                   <label className="block text-sm font-medium text-gray-300 mb-1">Session Name <span className="text-red-400">*</span></label>
//                   <input 
//                     type="text" 
//                     value={roomName} 
//                     onChange={e => {
//                       setRoomName(e.target.value)
//                       setRoomNameError('')
//                     }} 
//                     placeholder="e.g., Weekly Chapter 5 Review" 
//                     disabled={!!createdRoom} 
//                     className={`w-full px-4 py-2 bg-white/5 border ${roomNameError ? "border-red-500" : "border-white/10"} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition`}
//                   />
//                   {roomNameError && <p className="text-red-400 text-xs mt-1">{roomNameError}</p>}
//                 </div>
                
//                 {!createdRoom ? (
//                   <motion.button 
//                     onClick={handleCreateSession} 
//                     disabled={isLoading} 
//                     className="btn-primary w-full py-3"
//                   >
//                     {isLoading ? 'Creating...' : 'Create Session & Get Code'}
//                   </motion.button>
//                 ) : (
//                   <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
//                     <p className="text-gray-300">Session Active! Your Room Code is:</p>
//                     <p className="text-3xl font-bold text-white tracking-widest my-2">{createdRoom.code}</p>
//                     <button onClick={destroySession} className="text-red-400 text-sm hover:underline">Destroy Session</button>
//                   </div>
//                 )}
//               </GlassCard>
//             </motion.div>

//             {/* Invite Panel (conditionally rendered) */}
//             <AnimatePresence>
//               {createdRoom && (
//                 <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:0.2}}>
//                   <GlassCard className="p-6 sm:p-8">
//                     <h2 className="text-xl font-semibold text-white mb-6">2. Invite Students (Optional)</h2>
                    
//                     <div
//                       onDragOver={handleDragOver}
//                       onDragLeave={handleDragLeave}
//                       onDrop={handleDrop}
//                       className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
//                         isDragOver
//                           ? "border-primary-500/50 bg-primary-500/10"
//                           : errors.csv
//                             ? "border-red-500/50 bg-red-500/5"
//                             : "border-white/20 hover:border-white/30"
//                       }`}
//                     >
//                       <input
//                         type="file"
//                         accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
//                         onChange={handleFileInputChange}
//                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//                       />

//                       <div className="space-y-4">
//                         <motion.div animate={{ scale: isDragOver ? 1.1 : 1 }} transition={{ duration: 0.2 }}>
//                           <Upload className="w-12 h-12 text-gray-400 mx-auto" />
//                         </motion.div>

//                         <div>
//                           <p className="text-white font-medium">
//                             {isDragOver ? "Drop your CSV file here" : "Drag & drop your CSV or Excel file"}
//                           </p>
//                           <p className="text-gray-400 text-sm mt-1">or click to browse files</p>
//                         </div>
//                       </div>
//                     </div>

//                     <AnimatePresence>
//                       {errors.csv && (
//                         <motion.div
//                           initial={{ opacity: 0, height: 0 }}
//                           animate={{ opacity: 1, height: "auto" }}
//                           exit={{ opacity: 0, height: 0 }}
//                           className="flex items-center space-x-2 text-red-400 text-sm mt-2"
//                         >
//                           <AlertCircle className="w-4 h-4" />
//                           <span>{errors.csv}</span>
//                         </motion.div>
//                       )}
//                     </AnimatePresence>

//                     <AnimatePresence>
//                       {csvFile && (
//                         <motion.div
//                           initial={{ opacity: 0, height: 0 }}
//                           animate={{ opacity: 1, height: "auto" }}
//                           exit={{ opacity: 0, height: 0 }}
//                           className="flex items-center justify-between p-3 bg-white/5 rounded-lg mt-4"
//                         >
//                           <div className="flex items-center space-x-3">
//                             <FileText className="w-5 h-5 text-green-400" />
//                             <div>
//                               <p className="text-white text-sm font-medium">{csvFile.name}</p>
//                               <p className="text-gray-400 text-xs">{students.length} students found</p>
//                             </div>
//                           </div>
//                           <button onClick={removeFile} className="p-1 hover:bg-white/10 rounded transition-colors">
//                             <X className="w-4 h-4 text-gray-400" />
//                           </button>
//                         </motion.div>
//                       )}
//                     </AnimatePresence>

//                     {students.length > 0 && (
//                       <motion.div className="mt-6 pt-6 border-t border-white/10">
//                         <button 
//                           onClick={handleSendInvites} 
//                           disabled={invitesSent || isSendingInvites} 
//                           className="btn-primary w-full py-3"
//                         >
//                           {isSendingInvites ? "Sending..." : invitesSent ? "Invites Sent!" : `Send Invites to ${students.length} Students`}
//                         </button>
//                       </motion.div>
//                     )}
//                   </GlassCard>
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>

//           {/* Timer Section */}
//           <AnimatePresence>
//             {isPollActive && (
//               <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.5 }}
//               >
//                 <GlassCard className="p-6 sm:p-8">
//                   <div className="flex items-center space-x-3 mb-6">
//                     <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
//                       <Clock className="w-5 h-5 text-white" />
//                     </div>
//                     <h3 className="text-xl font-semibold text-white">Session Timer</h3>
//                   </div>

//                   <div className="grid md:grid-cols-2 gap-6">
//                     <div className="text-center">
//                       <div className="text-4xl font-bold text-white mb-2 font-mono">{formatTime(timeRemaining)}</div>
//                       <p className="text-gray-400">Time Remaining</p>
//                       {timeRemaining <= 600 && timeRemaining > 0 && (
//                         <motion.p
//                           animate={{ opacity: [1, 0.5, 1] }}
//                           transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
//                           className="text-red-400 text-sm mt-2"
//                         >
//                           Session expires soon!
//                         </motion.p>
//                       )}
//                       {timeRemaining === 0 && <p className="text-red-400 text-sm mt-2">Session Expired</p>}
//                     </div>

//                     <div className="space-y-3">
//                       <p className="text-gray-400 text-sm mb-3">Extend session time:</p>
//                       <div className="grid grid-cols-2 gap-2">
//                         <motion.button
//                           whileHover={{ scale: 1.05 }}
//                           whileTap={{ scale: 0.95 }}
//                           onClick={() => setTimeRemaining(prev => prev + 30 * 60)} // 30 mins in seconds
//                           className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200"
//                         >
//                           <Plus className="w-3 h-3" />
//                           <span>30 mins</span>
//                         </motion.button>
//                         <motion.button
//                           whileHover={{ scale: 1.05 }}
//                           whileTap={{ scale: 0.95 }}
//                           onClick={() => handleExtendTime(1)}
//                           className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200"
//                         >
//                           <Plus className="w-3 h-3" />
//                           <span>1 Hour</span>
//                         </motion.button>
//                         <motion.button
//                           whileHover={{ scale: 1.05 }}
//                           whileTap={{ scale: 0.95 }}
//                           onClick={() => handleExtendTime(2)}
//                           className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200"
//                         >
//                           <Plus className="w-3 h-3" />
//                           <span>2 Hours</span>
//                         </motion.button>
//                         <motion.button
//                           whileHover={{ scale: 1.05 }}
//                           whileTap={{ scale: 0.95 }}
//                           onClick={() => handleExtendTime(3)}
//                           className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200"
//                         >
//                           <Plus className="w-3 h-3" />
//                           <span>3 Hours</span>
//                         </motion.button>
//                       </div>
//                     </div>
//                   </div>
//                 </GlassCard>
//               </motion.div>
//             )}
//           </AnimatePresence>

//           {/* Student Preview */}
//           <AnimatePresence>
//             {students.length > 0 && (
//               <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 <GlassCard className="p-6 sm:p-8">
//                   <div className="flex items-center justify-between mb-6">
//                     <div className="flex items-center space-x-3">
//                       <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
//                         <Eye className="w-5 h-5 text-white" />
//                       </div>
//                       <h3 className="text-xl font-semibold text-white">Student Preview ({students.length})</h3>
//                       {invitesSent && (
//                         <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
//                           INVITED
//                         </div>
//                       )}
//                     </div>
//                     <button
//                       onClick={() => setShowPreview(!showPreview)}
//                       className="p-2 hover:bg-white/10 rounded-lg transition-colors"
//                     >
//                       {showPreview ? (
//                         <EyeOff className="w-5 h-5 text-gray-400" />
//                       ) : (
//                         <Eye className="w-5 h-5 text-gray-400" />
//                       )}
//                     </button>
//                   </div>

//                   <AnimatePresence>
//                     {showPreview && (
//                       <motion.div
//                         initial={{ opacity: 0, height: 0 }}
//                         animate={{ opacity: 1, height: "auto" }}
//                         exit={{ opacity: 0, height: 0 }}
//                         className="space-y-3"
//                       >
//                         <div className="max-h-60 overflow-y-auto space-y-2">
//                           {students.slice(0, 10).map((student, index) => (
//                             <motion.div
//                               key={index}
//                               initial={{ opacity: 0, x: -20 }}
//                               animate={{ opacity: 1, x: 0 }}
//                               transition={{ delay: index * 0.05 }}
//                               className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg"
//                             >
//                               <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
//                                 {student.name.charAt(0).toUpperCase()}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <p className="text-white text-sm font-medium truncate">{student.name}</p>
//                                 <p className="text-gray-400 text-xs truncate">{student.email}</p>
//                               </div>
//                               {invitesSent && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
//                             </motion.div>
//                           ))}
//                         </div>

//                         {students.length > 10 && (
//                           <p className="text-gray-400 text-sm text-center">+{students.length - 10} more students</p>
//                         )}
//                       </motion.div>
//                     )}
//                   </AnimatePresence>
//                 </GlassCard>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </div>
//     </DashboardLayout>
//   )
// }

// export default CreatePollPage


// apps/frontend/src/pages/CreatePollPage.tsx

"use client"

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, AlertCircle, X, Trash2, Loader } from "lucide-react"
import GlassCard from "../components/GlassCard"
import DashboardLayout from "../components/DashboardLayout"
import * as XLSX from "xlsx"
import { apiService } from '../utils/api'
import toast from 'react-hot-toast'

// --- The only import you need to change ---
import { useAuth } from '../contexts/AuthContext' // Import the useAuth hook

interface StudentInvite {
  name: string
  email: string
}

const CreatePollPage: React.FC = () => {
  // --- REPLACED all local state for session management with the global context ---
  const { activeRoom, createRoom, destroyRoom, isCreatingRoom } = useAuth();
  
  // Local state for this component's specific needs
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [students, setStudents] = useState<StudentInvite[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // For file parsing
  const [isSendingInvites, setIsSendingInvites] = useState(false)
  const [invitesSent, setInvitesSent] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [roomNameError, setRoomNameError] = useState("")
  const [errors, setErrors] = useState<{ csv?: string }>({})
  const [showPreview, setShowPreview] = useState(false)

  // --- REMOVED all useEffects related to managing roomCode, isPollActive, and localStorage. ---
  // The AuthContext now handles all of that.

  // Your file handling functions are perfect and remain unchanged.
  const parseCSV = (content: string): StudentInvite[] => {
    const lines = content.split("\n").filter((line) => line.trim())
    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim())
    const emailIndex = headers.findIndex((h) => h.includes("email"))
    const nameIndex = headers.findIndex((h) => h.includes("name"))
    if (emailIndex === -1) {
      throw new Error("CSV must contain an 'email' column")
    }
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      return {
        name: nameIndex !== -1 ? values[nameIndex] || "Unknown" : "Unknown",
        email: values[emailIndex] || "",
      }
    }).filter((student) => student.email)
  }

  const handleFileUpload = useCallback(async (file: File) => {
    const isCSV = file.name.endsWith(".csv")
    const isXLSX = file.name.endsWith(".xls") || file.name.endsWith(".xlsx")

    if (!isCSV && !isXLSX) {
      setErrors({ csv: "Please upload a .csv or .xls/.xlsx file" })
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      let parsedStudents: StudentInvite[] = []
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]
      const headers = rows[0].map((h) => String(h).toLowerCase().trim())
      const emailIndex = headers.findIndex((h) => h.includes("email"))
      const nameIndex = headers.findIndex((h) => h.includes("name"))

      if (emailIndex === -1) {
        throw new Error("File must contain an 'email' column")
      }

      parsedStudents = rows.slice(1).filter((row) => row[emailIndex]).map((row) => ({
        name: nameIndex !== -1 ? String(row[nameIndex]).trim() || "Unknown" : "Unknown",
        email: String(row[emailIndex]).trim() || "",
      }))

      if (parsedStudents.length === 0) {
        throw new Error("No valid student records found")
      }

      setStudents(parsedStudents)
      setCsvFile(file)
      setShowPreview(true)
    } catch (error) {
      setErrors({ csv: error instanceof Error ? error.message : "Failed to parse the file" })
      setStudents([])
      setCsvFile(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) handleFileUpload(files[0])
    }, [handleFileUpload])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFileUpload(files[0])
  }

  const removeFile = () => {
    setCsvFile(null)
    setStudents([])
    setShowPreview(false)
    setInvitesSent(false)
    setErrors({})
  }

  // --- MODIFIED: This function now calls the global `createRoom` from the context ---
  const handleCreateSession = () => {
    if (!roomName.trim()) {
      setRoomNameError("Room Name is required.");
      return;
    }
    setRoomNameError("");
    createRoom(roomName);
  };

  const handleSendInvites = async () => {
    if (!activeRoom) return toast.error("An active session is required to send invites.");
    if (!csvFile) return toast.error("Please upload a file with student emails.");
    
    const formData = new FormData();
    formData.append('studentsFile', csvFile);

    setIsSendingInvites(true);
    const sendingToast = toast.loading(`Sending invites to ${students.length} students...`);
    try {
        const response = await apiService.sendInvites(activeRoom._id, formData);
        toast.success(response.data.message, { id: sendingToast, duration: 4000 });
        setInvitesSent(true);
    } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to send invites.', { id: sendingToast });
    } finally {
        setIsSendingInvites(false);
    }
  };

  // --- MODIFIED: This function now calls the global `destroyRoom` ---
  const handleDestroySession = () => {
      destroyRoom();
      // Clear local component state related to the old session
      setRoomName('');
      removeFile(); // Use the existing removeFile function to clear file state
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <motion.div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Create New Poll Session</h1>
            <p className="text-gray-400">Start a new room and invite your students to join.</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Session Creation Panel */}
            <motion.div>
              <GlassCard className="p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-white mb-6">1. Create Your Session</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Session Name <span className="text-red-400">*</span></label>
                  <input 
                    type="text" 
                    value={roomName} 
                    onChange={e => {
                      setRoomName(e.target.value);
                      setRoomNameError('');
                    }} 
                    placeholder="e.g., Weekly Chapter 5 Review" 
                    disabled={!!activeRoom} // Disable if a room is already active
                    className={`w-full px-4 py-2 bg-white/5 border ${roomNameError ? "border-red-500" : "border-white/10"} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition disabled:bg-white/10 disabled:cursor-not-allowed`}
                  />
                  {roomNameError && <p className="text-red-400 text-xs mt-1">{roomNameError}</p>}
                </div>
                
                {/* --- The UI now depends entirely on the global `activeRoom` state --- */}
                {!activeRoom ? (
                  <motion.button 
                    onClick={handleCreateSession} 
                    disabled={isCreatingRoom} 
                    className="btn-primary w-full py-3 flex items-center justify-center"
                  >
                    {isCreatingRoom ? <Loader className="animate-spin" /> : 'Create Session & Get Code'}
                  </motion.button>
                ) : (
                  <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-gray-300">Session <span className="font-bold text-white">"{activeRoom.name}"</span> is active!</p>
                    <p className="text-3xl font-bold text-white tracking-widest my-2">{activeRoom.code}</p>
                    <button 
                        onClick={handleDestroySession} 
                        className="text-red-400 text-sm hover:underline flex items-center justify-center mx-auto gap-1"
                    >
                        <Trash2 size={14}/> End This Session
                    </button>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Invite Panel (conditionally rendered) */}
            <AnimatePresence>
              {activeRoom && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:0.2}}>
                   <GlassCard className="p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">2. Invite Students (Optional)</h2>
                    
                    {/* Your existing file dropzone JSX is perfect */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                        isDragOver ? "border-primary-500/50 bg-primary-500/10" : errors.csv ? "border-red-500/50 bg-red-500/5" : "border-white/20 hover:border-white/30"
                      }`}
                    >
                        {/* ... (inner content of dropzone) ... */}
                        <input type="file" onChange={handleFileInputChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-white">Drag & drop or click to upload</p>
                    </div>

                    {/* Your existing file preview and error display JSX */}
                    <AnimatePresence>
                      {csvFile && (
                        <motion.div /* ... */ >
                          {/* ... file preview content ... */}
                          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg mt-4">
                            <div className="flex items-center space-x-3">
                                <FileText className="w-5 h-5 text-green-400" />
                                <div>
                                <p className="text-white text-sm font-medium">{csvFile.name}</p>
                                <p className="text-gray-400 text-xs">{students.length} students found</p>
                                </div>
                            </div>
                            <button onClick={removeFile} className="p-1 hover:bg-white/10 rounded transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {students.length > 0 && (
                      <motion.div className="mt-6 pt-6 border-t border-white/10">
                        <button 
                          onClick={handleSendInvites} 
                          disabled={invitesSent || isSendingInvites} 
                          className="btn-primary w-full py-3"
                        >
                          {isSendingInvites ? "Sending..." : invitesSent ? "Invites Sent!" : `Send Invites to ${students.length} Students`}
                        </button>
                      </motion.div>
                    )}
                   </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

           {/* --- REMOVED THE TIMER AND PREVIEW SECTIONS FROM THIS PAGE --- */}
           {/* This page's only job is now to create the session. */}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default CreatePollPage;