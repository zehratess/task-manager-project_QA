import React, { useEffect, useMemo, useState } from "react";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import { LuUsers } from "react-icons/lu";
import Modal from "../Modal";
import AvatarGroup from "../AvatarGroup";
import defaultAvatar from "../../assets/images/default-avatar.jpeg";

const SelectUsers = ({ selectedUsers, setSelectedUsers }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      setAllUsers(response.data ?? []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  // Eğer parent selectedUsers sıfırlanırsa modal geçicisini de sıfırla
  useEffect(() => {
    if (!selectedUsers || selectedUsers.length === 0) {
      setTempSelectedUsers([]);
    }
  }, [selectedUsers]);

  const toggleUserSelection = (userId) => {
    setTempSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAssign = () => {
    setSelectedUsers(tempSelectedUsers);
    setIsModalOpen(false);
  };

  const openModal = () => {
    // Modal açılırken mevcut seçimleri geçici seçime kopyala
    setTempSelectedUsers(selectedUsers ?? []);
    setIsModalOpen(true);
  };

  // Seçilen kullanıcıların avatarları (boş string gelirse default’a düş)
  const selectedUserAvatars = useMemo(() => {
    const selectedSet = new Set(selectedUsers ?? []);
    return allUsers
      .filter((u) => selectedSet.has(u._id))
      .map((u) => (u.profileImageUrl?.trim() ? u.profileImageUrl : defaultAvatar));
  }, [allUsers, selectedUsers]);

  return (
    <div className="space-y-4 mt-2">
      {selectedUserAvatars.length === 0 ? (
        <button type="button" className="card-btn" onClick={openModal}>
          <LuUsers className="text-sm" />
          Add Members
        </button>
      ) : (
        <div className="cursor-pointer" onClick={openModal}>
          <AvatarGroup avatars={selectedUserAvatars} maxVisible={3} />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Users"
      >
        <div className="space-y-4 h-[60vh] overflow-y-auto">
          {allUsers.map((user) => {
            const avatarSrc = user.profileImageUrl?.trim()
              ? user.profileImageUrl
              : defaultAvatar;

            return (
              <div
                key={user._id}
                className="flex items-center gap-4 p-3 border-b border-gray-200"
              >
                <img
                  src={avatarSrc}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-[13px] text-gray-500">{user.email}</p>
                </div>

                <input
                  type="checkbox"
                  checked={tempSelectedUsers.includes(user._id)}
                  onChange={() => toggleUserSelection(user._id)}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded-sm outline-none"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            className="card-btn"
            onClick={() => setIsModalOpen(false)}
          >
            CANCEL
          </button>
          <button type="button" className="card-btn-fill" onClick={handleAssign}>
            DONE
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SelectUsers;
