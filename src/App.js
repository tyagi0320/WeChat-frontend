import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./App.css";

const socket = io.connect("https://wechat-backend-rzhi.onrender.com");

function VideoCallApp() {
    const [userId, setUserId] = useState("");
    const [stream, setStream] = useState(null);
    const [incomingCall, setIncomingCall] = useState(false);
    const [callerId, setCallerId] = useState("");
    const [callerSignal, setCallerSignal] = useState(null);
    const [callConnected, setCallConnected] = useState(false);
    const [peerId, setPeerId] = useState("");
    const [callEnded, setCallEnded] = useState(false);
    const [username, setUsername] = useState("");

    const myVideoRef = useRef();
    const peerVideoRef = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (myVideoRef.current) myVideoRef.current.srcObject = currentStream;
            })
            .catch((err) => console.error("Camera access error:", err));

        socket.on("me", (id) => setUserId(id));

        socket.on("callUser", (data) => {
            setIncomingCall(true);
            setCallerId(data.from);
            setCallerSignal(data.signal);
        });

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const initiateCall = (id) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (data) => {
            socket.emit("callUser", { userToCall: id, signalData: data, from: userId, name: username });
        });

        peer.on("stream", (peerStream) => {
            if (peerVideoRef.current) peerVideoRef.current.srcObject = peerStream;
        });

        socket.on("callAccepted", (signal) => {
            setCallConnected(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallConnected(true);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: callerId });
        });

        peer.on("stream", (peerStream) => {
            if (peerVideoRef.current) peerVideoRef.current.srcObject = peerStream;
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    const endCall = () => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600 p-6">
            <h1 className="text-3xl font-bold text-white mb-6">WeChat - Video Call App</h1>
            
            {/* Video Container */}
            <div className="flex gap-6 mb-6">
                <video ref={myVideoRef} playsInline muted autoPlay className="w-72 h-52 rounded-lg border-2 border-white shadow-lg" />
                {callConnected && !callEnded ? (
                    <video ref={peerVideoRef} playsInline autoPlay className="w-72 h-52 rounded-lg border-2 border-white shadow-lg" />
                ) : (
                    <div className="w-72 h-52 flex items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-800 text-white text-sm">
                        Remote Video
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg">
                <input
                    type="text"
                    placeholder="Your Name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                />
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Your ID: </span>
                    <span className="text-blue-500 font-semibold">{userId}</span>
                </div>

                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Enter ID to Call"
                        value={peerId}
                        onChange={(e) => setPeerId(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                </div>

                <div className="flex justify-between mt-4">
                    <button onClick={() => initiateCall(peerId)} className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md">
                        Call
                    </button>
                    {incomingCall && !callConnected && (
                        <button onClick={answerCall} className="px-4 py-2 bg-green-500 text-white rounded-md shadow-md">
                            Answer
                        </button>
                    )}
                    {callConnected && !callEnded && (
                        <button onClick={endCall} className="px-4 py-2 bg-red-500 text-white rounded-md shadow-md">
                            End Call
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoCallApp;
