import os
from playwright.sync_api import sync_playwright, expect

def run_verification():
    """
    This script verifies the new exploration-based game loop.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000")

        # Clear local storage to ensure a fresh start
        page.evaluate("() => { localStorage.clear(); }")
        page.reload()

        # Wait for the game to be fully initialized by checking for the map buttons
        expect(page.get_by_role("button", name="Sua Seita")).to_be_visible(timeout=15000)

        # --- 1. Initial State Check ---
        expect(page.locator("#char-actions")).to_have_text("2")
        expect(page.get_by_role("button", name="Sua Seita")).to_be_visible()
        expect(page.get_by_role("button", name="Cidade Próxima")).to_be_visible()
        expect(page.get_by_role("button", name="Montanhas Selvagens")).to_be_visible()

        # --- 2. Take First Action ---
        page.get_by_role("button", name="Cidade Próxima").click()

        # Assert that an event happened and actions decreased
        expect(page.locator("#event-content p")).not_to_be_empty()
        expect(page.locator("#char-actions")).to_have_text("1")

        # The choice button might not exist if the event has no choices
        # If it does, click it to continue
        if page.locator("#choices-container button").count() > 0:
            page.locator("#choices-container button").first.click()

        # --- 3. Take Second Action ---
        # Wait for the map to re-appear
        expect(page.get_by_role("button", name="Montanhas Selvagens")).to_be_visible(timeout=5000)
        page.get_by_role("button", name="Montanhas Selvagens").click()

        # Assert that actions are now 0
        expect(page.locator("#char-actions")).to_have_text("0")

        # --- 4. End of Turn Check ---
        # Assert that the map is gone and the "End Turn" button is visible
        expect(page.get_by_role("button", name="Sua Seita")).to_be_hidden()
        expect(page.get_by_role("button", name="Descansar (Próximo Ano)")).to_be_visible()

        initial_age = int(page.locator("#char-age").inner_text())

        # --- 5. Advance to Next Year ---
        page.get_by_role("button", name="Descansar (Próximo Ano)").click()

        # Assert that age increased and actions were reset
        expected_age = initial_age + 1
        expect(page.locator("#char-age")).to_have_text(str(expected_age))
        expect(page.locator("#char-actions")).to_have_text("2")

        # Assert that the map is back
        expect(page.get_by_role("button", name="Sua Seita")).to_be_visible()

        print("Exploration loop verification successful!")
        page.screenshot(path="jules-scratch/verification/exploration_loop_verified.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
