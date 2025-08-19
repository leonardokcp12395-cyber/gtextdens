import asyncio
import json
import re
from playwright.async_api import async_playwright, expect

async def set_game_state(page, state):
    state_json = json.dumps(state)
    await page.evaluate(f"localStorage.setItem('wuxiaGameState', {json.dumps(state_json)})")

async def main():
    async with async_playwright() as p:
        browser = await p.firefox.launch()
        page = await browser.new_page()

        await page.goto("file:///app/index.html")

        # --- Scenario 1: Promotion button is disabled ---
        state_low_rep = {
            "age": 17,
            "attributes": {"health":100,"maxHealth":100,"energy":100,"maxEnergy":100,"body":15,"mind":15,"soul":15,"luck":5,"defense":5,"critChance":0.05,"dodgeChance":0.05},
            "cultivation": {"realmIndex":1,"subRealmIndex":0,"qi":50},
            "resources": { "money": 10, "reputation": 5 },
            "sect": {"id":"hidden_cloud_sect","rankIndex":0,"contribution":50},
            "talentPoints": 0, "unlockedTalents": [], "inventory": [], "relationships": [], "lifeLog": [], "actionLog": [], "combat": None, "currentRegionId": "montanhas_seita"
        }
        await set_game_state(page, state_low_rep)
        await page.reload()

        # Wait for game to be fully loaded
        await expect(page.locator('body')).to_have_class('game-loaded', timeout=10000)

        # Open Sect Actions
        await page.locator("#sect-actions-btn").click()

        # Check that the promotion button is disabled
        promotion_btn_fail = page.get_by_role("button", name=re.compile("Tentar Promoção"))
        await expect(promotion_btn_fail).to_be_disabled()
        await page.screenshot(path="jules-scratch/verification/reputation_01_fail.png")

        # --- Scenario 2: Promotion button is enabled ---
        state_high_rep = {
            "age": 17,
            "attributes": {"health":100,"maxHealth":100,"energy":100,"maxEnergy":100,"body":15,"mind":15,"soul":15,"luck":5,"defense":5,"critChance":0.05,"dodgeChance":0.05},
            "cultivation": {"realmIndex":1,"subRealmIndex":0,"qi":50},
            "resources": { "money": 10, "reputation": 15 },
            "sect": {"id":"hidden_cloud_sect","rankIndex":0,"contribution":150},
            "talentPoints": 0, "unlockedTalents": [], "inventory": [], "relationships": [], "lifeLog": [], "actionLog": [], "combat": None, "currentRegionId": "montanhas_seita"
        }
        await set_game_state(page, state_high_rep)
        await page.reload()

        # Wait for game to be fully loaded
        await expect(page.locator('body')).to_have_class('game-loaded', timeout=10000)

        # Open Sect Actions
        await page.locator("#sect-actions-btn").click()

        # Check that the promotion button is enabled
        promotion_btn_success = page.get_by_role("button", name=re.compile("Tentar Promoção"))
        await expect(promotion_btn_success).to_be_enabled()
        await page.screenshot(path="jules-scratch/verification/reputation_02_success.png")

        await browser.close()
        print("Verification script completed successfully.")

if __name__ == "__main__":
    import re
    asyncio.run(main())
