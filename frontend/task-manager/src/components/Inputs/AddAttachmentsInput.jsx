import React, { useState } from "react";
import { LuLink, LuUpload, LuX } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-hot-toast";

const AddAttachmentsInput = ({ todoList, setTodoList, user }) => {
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);

  // ✅ Link ekleme
  const handleAddLink = () => {
    if (inputValue.trim()) {
      const newLink = {
        fileName: "External Link",
        storagePath: inputValue.trim(),
        fileSize: 0,
        uploader: user?._id,
      };
      setTodoList([...todoList, newLink]);
      setInputValue("");
    }
  };

  // ✅ Dosya upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axiosInstance.post(
        "/api/files/upload-file",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // AddAttachmentsInput.jsx içindeki handleFileUpload fonksiyonu
      if (response.data.fileUrl) {
        // Modeldeki isimlerle (fileName, storagePath vb.) eşleşmesi lazım
        const newFile = {
          fileName: response.data.fileName || file.name,
          storagePath: response.data.fileUrl,
          fileSize: response.data.fileSize || file.size,
          uploader: user?._id, // Context'ten gelen kullanıcı ID'si
        };

        setTodoList([...todoList, newFile]); // Artık diziye obje atıyoruz
        toast.success("File uploaded successfully!");
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleRemove = (index) => {
    const updatedList = todoList.filter((_, i) => i !== index);
    setTodoList(updatedList);
  };

  return (
    <div>
      {/* Link Input */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="Add link (e.g., https://example.com)"
          className="form-input flex-1"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddLink()}
        />
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded cursor-pointer hover:bg-blue-600 w-fit"
          onClick={handleAddLink}
        >
          <LuLink /> Add Link
        </button>
      </div>

      {/* File Upload */}
      <div className="mt-3">
        <label className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-xs rounded cursor-pointer hover:bg-green-600 w-fit">
          <LuUpload />
          {uploading ? "Uploading..." : "Upload File"}
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Attachment List */}
      <div className="mt-3">
        {todoList.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-2"
          >
            {/* Attachment List kısmındaki p etiketi */}
            <p className="text-xs text-gray-700 truncate flex-1">
              {item.fileName}{" "}
              {/* item artık obje olduğu için .fileName diyoruz */}
            </p>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-red-500 hover:text-red-700"
            >
              <LuX />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddAttachmentsInput;
