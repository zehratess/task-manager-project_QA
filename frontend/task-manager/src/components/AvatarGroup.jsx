import React from 'react';

const AvatarGroup = ({avatars, maxVisible = 3}) => {
    return (
        <div className="flex items-center">
            {avatars.slice(0, maxVisible).map((avatar, index) => (
                <img
                    key={index}
                    src={avatar}
                    alt={`Avatar ${index}`}
                    className="w-9 h-9 rounded-full border-2 border-white shadow-md -ml-3 first:ml-0"
                />
            ))}
            {avatars.length > maxVisible && (
                <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-r from-indigo-100 to-purple-100 text-sm font-semibold text-indigo-700 rounded-full border-2 border-white shadow-md -ml-3">
                    +{avatars.length - maxVisible}
                </div>
            )}
        </div>
    );
};

export default AvatarGroup;