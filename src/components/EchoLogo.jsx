import logo from "../assets/echo-logo.png";

export default function EchoLogo({ size = 32, style = {} }) {
  return (
    <img
      src={logo}
      width={size}
      height={size}
      style={{
        objectFit: "contain",
        display: "block",
        ...style,
      }}
      alt="Echo"
    />
  );
}
