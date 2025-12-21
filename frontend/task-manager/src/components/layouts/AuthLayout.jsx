import React from "react";

const AuthLayout = ({children})=> {
    return <div className="flex">
        <div className="w-screen h-screen md:w-[60vw] px-12 pt-8 pb-12">
            <h2 className="text-4xl font-medium text-black">GOINON</h2>
            {children}
        </div>
        
    <div className="hidden md:flex w-[40vw] h-screen bg-blue-50 bg-[url('/bg-img.png')] bg-cover bg-no-repeat bg-center overflow-hidden">
    </div>
    </div>
};
export default AuthLayout