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

        # --- Scenario 1: Verify Breakthrough UI ---
        state_breakthrough = {
            "age": 15,
            "attributes": {"health":100,"maxHealth":100,"energy":100,"maxEnergy":100,"body":15,"mind":15,"soul":15,"luck":5,"defense":5,"critChance":0.05,"dodgeChance":0.05},
            "cultivation": {"realmIndex":0,"subRealmIndex":2,"qi":100},
            "inventory": [], "relationships": [], "lifeLog": [], "actionLog": [], "sect": {"id":None,"rankIndex":0,"contribution":0}, "combat": None, "currentRegionId": "vila_inicial"
        }
        await set_game_state(page, state_breakthrough)
        await page.reload()
        await expect(page.locator('body')).to_have_class('game-loaded', timeout=10000)

        await page.get_by_role("button", name="Descansar (Avançar Ano)").click()

        await expect(page.get_by_role("button", name="Tentar o avanço agora.")).to_be_visible()
        await expect(page.get_by_role("button", name="Esperar e acumular mais base.")).to_be_visible()
        await page.screenshot(path="jules-scratch/verification/fix_01_breakthrough_ui.png")

        # --- Scenario 2: Verify Mission Combat ---
        state_sect = {
            "age": 17,
            "attributes": {"health":100,"maxHealth":100,"energy":100,"maxEnergy":100,"body":15,"mind":15,"soul":15,"luck":5,"defense":5,"critChance":0.05,"dodgeChance":0.05},
            "cultivation": {"realmIndex":1,"subRealmIndex":0,"qi":50},
            "resources": { "money": 10, "reputation": 5 },
            "sect": {"id":"hidden_cloud_sect","rankIndex":0,"contribution":50},
            "inventory": [], "relationships": [], "lifeLog": [], "actionLog": [], "combat": None, "currentRegionId": "montanhas_seita"
        }
        await set_game_state(page, state_sect)
        await page.reload()
        await expect(page.locator('body')).to_have_class('game-loaded', timeout=10000)

        await page.locator("#sect-actions-btn").click()
        await page.get_by_role("button", name="Aceitar Missão da Seita").click()

        # This is the bug fix: combat should now start
        await expect(page.get_by_text("Você encontrou um(a) Besta Demoníaca Fraca feroz!")).to_be_visible()
        await expect(page.get_by_role("button", name="Atacar!")).to_be_visible()
        await page.screenshot(path="jules-scratch/verification/fix_02_mission_combat.png")

        await browser.close()
        print("Verification script completed successfully.")

if __name__ == "__main__":
    import re
    asyncio.run(main())
