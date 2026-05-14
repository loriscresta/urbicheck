import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
              <span style={{ fontSize: 22 }}>⚠</span>
            </div>
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "#1A3A6B", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Si è verificato un errore
            </p>
            <p
              className="text-xs mb-4"
              style={{ color: "#7A7268", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {this.state.error?.message || "Errore sconosciuto"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="text-xs px-4 py-2 border"
              style={{
                borderColor: "#1A3A6B",
                color: "#1A3A6B",
                background: "transparent",
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: "pointer",
              }}
            >
              Ricarica pagina
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}