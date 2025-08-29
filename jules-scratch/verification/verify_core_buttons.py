import os
from playwright.sync_api import sync_playwright, expect

def run_verification():
    """
    This script verifies the core button functionality of the game.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000")

        # Wait for the game to initialize
        expect(page.locator("#life-log-list li").first).to_be_visible(timeout=10000)

        # --- Test Meditate Button ---
        initial_qi = int(page.locator("#cult-qi").inner_text())
        page.get_by_role("button", name="Meditar").click()

        # Get the Qi value after clicking
        # We need to wait for the text to change, so we use an assertion with a timeout
        # A simple inner_text() right after click might be too fast.
        expect(page.locator("#cult-qi")).not_to_have_text(str(initial_qi), timeout=5000)

        final_qi = int(page.locator("#cult-qi").inner_text())
        assert final_qi > initial_qi, f"Qi should have increased, but went from {initial_qi} to {final_qi}"

        # --- Test Talents Button ---
        talents_panel = page.locator("#talents-screen")
        expect(talents_panel).to_be_hidden()

        page.get_by_role("button", name="Talentos").click()

        expect(talents_panel).to_be_visible()

        # --- Test Close Talents Button ---
        page.get_by_role("button", name="Fechar").click()
        expect(talents_panel).to_be_hidden()

        print("Core button verification successful!")
        # Create a dummy screenshot to mark completion
        page.screenshot(path="jules-scratch/verification/core_buttons_verified.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
