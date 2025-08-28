import os
from playwright.sync_api import sync_playwright, expect

def run_debug_script():
    """
    This script is for debugging. It checks if the showSpecialMerchantStore function
    is being called by looking for a change in background color.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000")

        # Wait for the game to initialize
        expect(page.locator("#life-log-list li").first).to_be_visible(timeout=10000)

        # Cheat to set up the game state
        page.evaluate("""() => {
            let gs = JSON.parse(localStorage.getItem('immortalJourneySave'));
            gs.resources.spirit_stones = 20;
            localStorage.setItem('immortalJourneySave', JSON.stringify(gs));
        }""")

        page.reload()
        expect(page.locator("#res-spirit-stones")).to_have_text("20")

        # Force the special merchant event
        page.evaluate("() => { window.handleSpecialEffects('force_event_special_merchant_encounter'); }")

        # Click the button to show the store
        page.get_by_role("button", name="Deixe-me ver o que você tem.").click()

        # Wait a moment for the effect to apply, then take a screenshot
        page.wait_for_timeout(500) # 500ms should be enough for the background color to change

        page.screenshot(path="jules-scratch/verification/debug_screenshot.png")

        browser.close()

if __name__ == "__main__":
    run_debug_script()
