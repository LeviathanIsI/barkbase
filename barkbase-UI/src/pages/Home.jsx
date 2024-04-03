import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  useEffect(() => {
    const adjustContentHeight = () => {
      // Assuming your navbar has an id of 'navbar'
      const navbarHeight = document.querySelector("#navbar").offsetHeight;
      const content = document.querySelector("#main-content");
      if (content) {
        content.style.minHeight = `calc(100vh - ${navbarHeight}px)`;
      }
    };

    window.addEventListener("resize", adjustContentHeight);
    // Run once to ensure proper sizing on initial load
    adjustContentHeight();

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", adjustContentHeight);
  }, []); // Empty dependency array means this effect runs once on mount and cleanup on unmount
  
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4"
      id="main-content"
    >
      <h1 className="text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white">
        BarkBase
      </h1>
      <h2 className="text-xl lg:text-2xl text-center my-4 text-gray-800 dark:text-gray-200">
        Unleash Efficiency: Revolutionize Your Kennel Management with BarkBase
      </h2>
      <p className="text-base text-center leading-relaxed text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        BarkBase is designed to streamline and enhance the operations of
        kennels, making management tasks both simple and efficient. By
        integrating booking, customer management, and health tracking into one
        easy-to-use platform, BarkBase ensures a seamless experience for kennel
        owners and pet parents alike. Kennel owners can effortlessly manage
        reservations, access pet health records, and communicate with pet
        owners, all from a single dashboard. For guests, BarkBase offers peace
        of mind, providing real-time updates on their pets' care and activities.
        With BarkBase, experience the ease of managing kennel operations,
        improved pet care, and strengthened relationships between kennels and
        pet owners. Join us in revolutionizing kennel management and elevate the
        standard of pet care today.
      </p>
    </div>
  );
};

export default Home;
