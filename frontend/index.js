// JavaScript for SceneIt Dashboard
// This file handles all interactive features except dropdown (which is in HTML)

class SceneItDashboard {
  constructor() {
    this.scrollInterval = null
    this.isHovering = false
    this.hoverDirection = null

    // Initialize when DOM is loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init())
    } else {
      this.init()
    }
  }

  init() {
    console.log("SceneIt Dashboard initializing...")
    this.initializeUsername()
    this.initializeScrolling()
    this.loadUpcomingMovies()
    this.loadPopularMovies()
    console.log("SceneIt Dashboard initialized successfully!")
  }

  // ===== USERNAME FUNCTIONALITY =====
  initializeUsername() {
    const urlParams = new URLSearchParams(window.location.search)
    const username = urlParams.get("username")
    const usernameElement = document.getElementById("username")

    if (username && usernameElement) {
      usernameElement.textContent = username
      console.log(`Welcome ${username}!`)
    } else if (!username) {
      console.warn("No username found")
      // Comment out redirect for testing
      // window.location.href = "login.html"
    }
  }

  // ===== SCROLLING FUNCTIONALITY =====
  initializeScrolling() {
    const container = document.getElementById("upcoming-movie-cards")
    const leftScroll = document.getElementById("leftScroll")
    const rightScroll = document.getElementById("rightScroll")

    if (!container || !leftScroll || !rightScroll) {
      console.warn("Scroll elements not found")
      return
    }

    // Hover-based scrolling
    leftScroll.addEventListener("mouseenter", () => this.startScroll("left", container))
    leftScroll.addEventListener("mouseleave", () => this.stopScroll())
    leftScroll.addEventListener("click", () => {
      container.scrollLeft -= 400
    })

    rightScroll.addEventListener("mouseenter", () => this.startScroll("right", container))
    rightScroll.addEventListener("mouseleave", () => this.stopScroll())
    rightScroll.addEventListener("click", () => {
      container.scrollLeft += 400
    })

    // Enhanced mouse tracking for more responsive scrolling
    this.initializeMouseTracking(container, leftScroll, rightScroll)

    console.log("Scrolling functionality initialized")
  }

  startScroll(direction, container) {
    this.stopScroll()

    // Immediate first scroll to reduce perceived lag
    container.scrollLeft += direction === "right" ? 30 : -30

    // Continue with regular interval scrolling
    this.scrollInterval = setInterval(() => {
      container.scrollLeft += direction === "right" ? 20 : -20
    }, 10)
  }

  stopScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval)
      this.scrollInterval = null
    }
  }

  initializeMouseTracking(container, leftScroll, rightScroll) {
    document.addEventListener("mousemove", (e) => {
      const leftRect = leftScroll.getBoundingClientRect()
      const rightRect = rightScroll.getBoundingClientRect()

      if (
        e.clientX >= leftRect.left &&
        e.clientX <= leftRect.right &&
        e.clientY >= leftRect.top &&
        e.clientY <= leftRect.bottom
      ) {
        if (!this.isHovering || this.hoverDirection !== "left") {
          this.isHovering = true
          this.hoverDirection = "left"
          this.startScroll("left", container)
        }
      } else if (
        e.clientX >= rightRect.left &&
        e.clientX <= rightRect.right &&
        e.clientY >= rightRect.top &&
        e.clientY <= rightRect.bottom
      ) {
        if (!this.isHovering || this.hoverDirection !== "right") {
          this.isHovering = true
          this.hoverDirection = "right"
          this.startScroll("right", container)
        }
      } else if (this.isHovering) {
        this.isHovering = false
        this.hoverDirection = null
        this.stopScroll()
      }
    })
  }

  
} 

// Initialize the dashboard when the script loads
const dashboard = new SceneItDashboard()

// Export for potential future use (if you switch to modules later)
if (typeof module !== "undefined" && module.exports) {
  module.exports = SceneItDashboard
}