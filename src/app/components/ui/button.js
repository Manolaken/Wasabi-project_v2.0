// Archivo: src/app/components/ui/button.js
export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "primary", 
  className = "",
  type = "button",
  ...props 
}) {
  // Definir estilos base
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed";
  
  // Definir variantes de estilo
  const variants = {
    primary: "bg-red-500 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:text-gray-200",
    secondary: "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:text-gray-200",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:text-gray-200",
    export: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:text-gray-200",
    add: "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:text-gray-200"
  };
  
  // Combinar estilos
  const buttonStyles = `${baseStyles} ${variants[variant]} ${className}`;
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={buttonStyles}
      {...props}
    >
      {children}
    </button>
  );
}