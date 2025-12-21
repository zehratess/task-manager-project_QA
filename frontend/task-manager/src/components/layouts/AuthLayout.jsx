import React from "react";
import bgImage from "../../assets/images/bg.png";

const AuthLayout = ({children})=> {
    return (
        <div 
            className="min-h-screen w-full relative flex items-center justify-center px-4"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                imageRendering: '-webkit-optimize-contrast',
                transform: 'translateZ(0)',
                willChange: 'transform'
            }}
        >
            {/* Login/SignUp Form Container */}
            <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12">
                <h2 className="text-4xl font-medium text-black mb-8">GOINON</h2>
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;