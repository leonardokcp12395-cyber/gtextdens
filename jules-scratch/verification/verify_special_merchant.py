import os
from playwright.sync_api import sync_playwright, expect

def run_verification():
    """
    This script verifies the special merchant event chain.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000")

        # Wait for the game to initialize
        expect(page.locator("#life-log-list li").first).to_be_visible(timeout=10000)

        # 1. Cheat to set up the game state
        page.evaluate("""() => {
            let gs = JSON.parse(localStorage.getItem('immortalJourneySave'));
            gs.resources.spirit_stones = 20;
            localStorage.setItem('immortalJourneySave', JSON.stringify(gs));
        }""")

        # Reload to apply the cheated state
        page.reload()
        expect(page.locator("#res-spirit-stones")).to_have_text("20")

        # Get initial lifespan
        initial_lifespan = int(page.locator("#char-lifespan").inner_text())

        # 2. Force the special merchant event
        page.evaluate("() => { window.handleSpecialEffects('force_event_special_merchant_encounter'); }")

        # 3. Interact with the store
        expect(page.locator("#event-content")).to_contain_text("Interessado em mercadorias verdadeiramente raras")
        page.get_by_role("button", name="Deixe-me ver o que você tem.").click()

        # Check that the store is displayed
        expect(page.locator("#event-content")).to_contain_text("Você tem 20 Pedras Espirituais.")

        # Buy the Phoenix Feather
        page.get_by_role("button", name="Pena de Fênix - 10 Pedras Espirituais").click()

        # 4. Assert the results
        # Store should refresh and show updated spirit stones
        expect(page.locator("#event-content")).to_contain_text("Você tem 10 Pedras Espirituais.")
        # Check the main UI as well
        expect(page.locator("#res-spirit-stones")).to_have_text("10")

        # Check that lifespan has increased
        expected_lifespan = initial_lifespan + 10
        expect(page.locator("#char-lifespan")).to_have_text(str(expected_lifespan))

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
