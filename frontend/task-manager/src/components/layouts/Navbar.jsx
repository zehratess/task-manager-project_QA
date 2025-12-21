import React, { useState } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import SideMenu from "./SideMenu";

const Navbar = ({ activeMenu }) => {
    const [openSideMenu, setOpenSideMenu] = useState(false);

    return (
        <div className="flex gap-5 bg-white/70 backdrop-blur-md border-b border-slate-200/40 py-4 px-7 sticky top-0 z-30 shadow-sm shadow-slate-200/50">
            <button
                className="block lg:hidden text-slate-700 hover:text-indigo-600 transition-colors"
                onClick={() => {
                    setOpenSideMenu(!openSideMenu);
                }}
            >
                {openSideMenu ? (
                    <HiOutlineX className="text-2xl" />
                ) : (
                    <HiOutlineMenu className="text-2xl" />
                )}
            </button>


            <header className="flex items-center justify-center h-full w-full gap-3">
                
                <h2 className="text-xl font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    GOINON
                </h2>
            </header>

            {openSideMenu && (
                <div className="fixed top-[61px] -ml-4 bg-white/90 backdrop-blur-md shadow-xl shadow-slate-200/50">
                    <SideMenu activeMenu={activeMenu} />
                </div>
            )}
        </div>
    )
}

export default Navbar