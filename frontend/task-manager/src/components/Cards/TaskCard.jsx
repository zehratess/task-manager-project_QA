import React from "react";
import Progress from "../Progress";
import AvatarGroup from "../AvatarGroup";
import { LuPaperclip } from "react-icons/lu";
import moment from "moment";

const TaskCard = ({
    title,
    description,
    priority,
    status,
    progress,
    createdAt,
    dueDate,
    assignedTo,
    attachmentCount,
    completedTodoCount,
    todoChecklist,
    onClick
}) => {

    const getStatusTagColor = () => {
        switch (status) {
            case "In Progress":
                return "text-sky-600 bg-sky-50/80 border border-sky-300/30";

            case "Completed":
                return "text-emerald-600 bg-emerald-50/80 border border-emerald-300/30";

            default:
                return "text-purple-600 bg-purple-50/80 border border-purple-300/30";
        }
    };

    const getPriorityTagColor = () => {
        switch (priority) {
            case "Low":
                return "text-teal-600 bg-teal-50/80 border border-teal-300/30";

            case "Medium":
                return "text-amber-600 bg-amber-50/80 border border-amber-300/30";

            default:
                return "text-rose-600 bg-rose-50/80 border border-rose-300/30";
        }
    };

    return (
        <div 
            className="bg-white/75 backdrop-blur-md rounded-xl py-4 shadow-lg shadow-slate-200/50 border border-slate-200/40 cursor-pointer hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300"
            onClick={onClick}
        >
            <div className="flex items-end gap-3 px-4">
                <div 
                    className={`text-[11px] font-medium ${getStatusTagColor()} px-4 py-0.5 rounded-full`}
                >
                    {status}
                </div>
                <div 
                    className={`text-[11px] font-medium ${getPriorityTagColor()} px-4 py-0.5 rounded-full`}
                >
                    {priority} Priority
                </div>
            </div>

            <div 
                className={`px-4 border-l-[3px] ${
                    status === "In Progress"
                    ? "border-sky-400"
                    : status === "Completed"
                    ? "border-emerald-400"
                    : "border-purple-400"
                }`}
            >
                <p className="text-sm font-medium text-gray-800 mt-4 line-clamp-2">
                    {title}
                </p>

                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-[18px]">
                    {description}
                </p>

                <p className="text-[13px] text-gray-700/80 font-medium mt-2 mb-2 leading-[18px]">
                    Task Done:{" "}
                    <span className="font-semibold text-gray-700">
                        {completedTodoCount} / {todoChecklist?.length || 0}
                    </span>
                </p>
                
                <Progress progress={progress} status={status} />
            </div>

            <div className="px-4">
                <div className="flex items-center justify-between my-1">
                    <div>
                        <label className="text-xs text-gray-500">
                            Start Date
                        </label>
                        <p className="text-[13px] font-medium text-gray-900">
                            {moment(createdAt).format("Do MMM YYYY")}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">Due Date</label>
                        <p className="text-[13px] font-medium text-gray-900">
                            {moment(dueDate).format("Do MMM YYYY")}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                    <AvatarGroup avatars={assignedTo || []} />

                    {attachmentCount > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-200/50">
                            <LuPaperclip className="text-indigo-600" />
                            <span className="text-xs text-gray-900">{attachmentCount}</span>
                        </div>
                    )}
                </div> 
            </div>
        </div>
    );
};

export default TaskCard;