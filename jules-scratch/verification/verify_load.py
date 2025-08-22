from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the game
        page.goto("http://localhost:8000")

        # Wait for the game to be fully loaded by checking for the class on the body
        expect(page.locator("body")).to_have_class("game-loaded", timeout=20000)
        print("SUCCESS: The game loaded correctly and the 'game-loaded' class was found.")

    except Exception as e:
        print(f"ERROR: The game failed to load. {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        raise

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
