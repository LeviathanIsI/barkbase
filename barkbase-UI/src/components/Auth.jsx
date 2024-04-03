import { useState, useEffect } from "react";

function Auth(props) {
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

  const [showLogin, setShowLogin] = useState(true);
  const [formData, setFormData] = useState({
    userName: "",
    password: "",
  });

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      props.setUser(data.user);
      localStorage.setItem("token", data.token);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSignUp = async () => {
    try {
      const response = await fetch("http://localhost:3001/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      props.setUser(data.newUser);
      localStorage.setItem("token", data.token);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900"
      id="main-content"
    >
      {showLogin ? (
        <section className="p-8 bg-white dark:bg-gray-700 rounded-lg shadow-md">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500"
            alt="Your Company"
          />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Sign in to your account{" "}
            <small className="font-normal text-sm text-gray-500 dark:text-gray-400">
              Need an account? <strong>Sign up</strong>{" "}
              <span
                onClick={() => setShowLogin(!showLogin)}
                className="cursor-pointer text-blue-500 dark:text-blue-400"
              >
                <strong>here</strong>
              </span>
            </small>
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              name="userName"
              placeholder="Username or Email"
              value={formData.userName || formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            />
            <input
              type="text"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            />
            <input
              type="submit"
              value="Log In"
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-700"
            />
            <div className="text-sm">
              <a
                href="#"
                className="font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Forgot password?
              </a>
            </div>
          </form>
          <p className="mt-10 text-center text-sm text-gray-400">
            Not a member?{" "}
            <a
              href="#"
              className="font-semibold leading-6 text-indigo-400 hover:text-indigo-300"
            >
              Start a 14 day free trial
            </a>
          </p>
        </section>
      ) : (
        <section className="p-8 bg-white dark:bg-gray-700 rounded-lg shadow-md">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500"
            alt="Your Company"
          />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Create an account{" "}
            <small className="font-normal text-sm text-gray-500 dark:text-gray-400">
              Already have an account? <strong>Sign in</strong>{" "}
              <span
                onClick={() => setShowLogin(!showLogin)}
                className="cursor-pointer text-blue-500 dark:text-blue-400"
              >
                <strong>here</strong>
              </span>
            </small>
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignUp();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              name="userName"
              placeholder="Username"
              value={formData.userName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            />
            <input
              type="text"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            />
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            >
              <option value="">Select Account Type</option>
              <option value="admin">Business Owner</option>
              <option value="guest">Pet Parent</option>
            </select>
            <input
              type="submit"
              value="Sign Up"
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-700"
            />
          </form>
          <p className="mt-10 text-center text-sm text-gray-400">
            Not a member?{" "}
            <a
              href="#"
              className="font-semibold leading-6 text-indigo-400 hover:text-indigo-300"
            >
              Start a 14 day free trial
            </a>
          </p>
        </section>
      )}
    </div>
  );
}

export default Auth;
