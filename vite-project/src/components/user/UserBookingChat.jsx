import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

const UserBookingChat = () => {
  const { bookingId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchBookingDetails();
    fetchMessages();

    // Set up WebSocket or polling for real-time updates
    const interval = setInterval(fetchMessages, 5000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setBooking(data);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/bookings/${bookingId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (response.ok) {
        setNewMessage("");
        fetchMessages(); // Refresh messages
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Filter messages to prevent sharing contact info
  const filteredMessage = (text) => {
    const phoneRegex = /\b\d{10,13}\b/g;
    const emailRegex = /\S+@\S+\.\S+/g;

    return text
      .replace(phoneRegex, "[CONTACT INFO REMOVED]")
      .replace(emailRegex, "[EMAIL REMOVED]");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Chat Header */}
        <div className="bg-white rounded-t-xl shadow-sm p-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Chat with Arena Owner
              </h1>
              <p className="text-sm text-gray-600">
                Booking #{bookingId} • {booking?.arena_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Status:{" "}
                <span className="text-yellow-600">{booking?.status}</span>
              </p>
              <p className="text-xs text-gray-500">
                {new Date(booking?.date).toLocaleDateString()} •{" "}
                {booking?.start_time} - {booking?.end_time}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-b-xl shadow-sm p-4 h-[calc(100vh-200px)] flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`flex ${
                      msg.sender_type === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                        msg.sender_type === "user"
                          ? "bg-primary-100 text-primary-900"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{filteredMessage(msg.message)}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>

          {/* Warning about contact info */}
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ For your safety, phone numbers and email addresses are
            automatically removed from messages.
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserBookingChat;
