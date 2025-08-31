import os
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    Navigates to the game via a local web server, captures console logs,
    and then verifies the technique management screen.
    """
    # 1. Arrange: Set up a listener to capture all browser console messages.
    def log_console_message(msg):
        print(f"Browser Console: [{msg.type}] {msg.text}")

    page.on("console", log_console_message)

    # 2. Arrange: Navigate to the local web server.
    page.goto('http://localhost:8000/index.html')

    # 3. Assert: Wait for the game to load successfully.
    try:
        page.wait_for_function("() => window.gameState !== undefined", timeout=5000)
        print("Game loaded successfully.")
    except Exception:
        print("Game failed to load even with a web server. Check console output for errors.")
        return

    # 4. Act: Use page.evaluate to become a cultivator and update the UI
    page.evaluate("() => { window.gameState.isCultivator = true; window.updateUI(); }")

    # 5. Assert: The "Manage Techniques" button should now be visible.
    manage_techniques_btn = page.get_by_role("button", name="Gerir Técnicas")
    expect(manage_techniques_btn).to_be_visible()

    # 6. Act: Click the button.
    manage_techniques_btn.click()

    # 7. Assert: The "Martial Pavilion" (techniques screen) should appear.
    techniques_screen = page.locator("#techniques-screen")
    expect(techniques_screen).to_be_visible()

    # Also assert that the title is visible
    expect(techniques_screen.get_by_role("heading", name="Pavilhão Marcial")).to_be_visible()

    # 8. Screenshot: Capture the result for visual verification.
    screenshot_path = 'jules-scratch/verification/technique-screen.png'
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()
