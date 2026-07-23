import time
import json
from playwright.sync_api import sync_playwright, expect

def run_verification(page):
  # Intercept AppSheet API requests and mock them to test the page offline/isolated
  def handle_route(route):
    url = route.request.url
    method = route.request.method
    print(f"[MOCK ROUTER] Intercepted {method} {url}")

    if "CLIENTES" in url:
      mock_data = [
        {
          "IDCliente": "1",
          "NombreCliente": "María González",
          "Telefono": "+34 612 345 678",
          "Direccion": "Calle Principal 123",
          "NIT": "1234567-8",
          "Email": "maria@example.com"
        }
      ]
      route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_data))
    elif "stock" in url:
      mock_data = [
        {
          "Material": "Saco-01",
          "TextoBreveDelMaterial": "Saco de Alimento Premium Ovejas 25kg",
          "Precio": 45.00,
          "Stock": 10,
          "Categoría": "Alimentos",
          "Marca": "Premium"
        }
      ]
      route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_data))
    else:
      # Default mock success response for other AppSheet endpoints like Preventa and DETALLE_PREVENTA
      route.fulfill(status=200, content_type="application/json", body=json.dumps({"status": "success"}))

  page.route("**/api/v2/apps/**", handle_route)

  # Capture console logs
  page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.text}"))

  print("1. Navigating to App Sheep website dashboard...")
  page.goto("http://localhost:3000")
  page.wait_for_load_state("networkidle")

  # Click the "Nueva Preventa" button on dashboard, which should redirect to nueva-preventa.html
  print("2. Clicking 'Nueva Preventa' button on dashboard...")
  page.get_by_role("button", name="Nueva Preventa").click()
  page.wait_for_load_state("networkidle")

  print(f"-> Current URL: {page.url}")
  assert "nueva-preventa.html" in page.url, "Should have redirected to nueva-preventa.html"

  # Wait for AppSheet API background fetch to complete
  print("Waiting 3 seconds for AppSheet API data fetch to complete...")
  page.wait_for_timeout(3000)

  # Check if we have clients and products loaded (from the UI lists)
  page.screenshot(path="/home/jules/verification/nueva_preventa_loaded.png")

  # Try to search and select a client
  print("3. Searching for a client...")
  page.locator("#search-client").click()
  page.locator("#search-client").fill("María")
  page.wait_for_timeout(1000)

  # Check if dropdown has options and click the first one
  dropdown_visible = page.locator("#clients-dropdown").is_visible()
  print(f"-> Clients dropdown visible: {dropdown_visible}")
  if dropdown_visible:
    first_btn = page.locator("#clients-dropdown button").first
    if first_btn.is_visible():
      print("Clicking first client from dropdown...")
      first_btn.click()
      page.wait_for_timeout(500)
    else:
      print("No buttons inside dropdown")
  else:
    print("Clients dropdown is not visible")

  # Add first product to cart if available
  first_add_btn = page.locator("#catalog-list tr button").first
  if first_add_btn.is_visible():
    print("Adding first product to cart...")
    first_add_btn.click()
    page.wait_for_timeout(500)
  else:
    print("No products found to add to cart")

  # Fill notes
  page.locator("#preventa-notas").fill("Notas de prueba de Jules")

  # Take screenshot of the filled form
  page.screenshot(path="/home/jules/verification/filled_new_form.png")

  # We can optionally click submit if elements were filled and we want to see it run
  print("5. Verifying submit button status...")
  submit_disabled = page.locator("#btn-submit-preventa").is_disabled()
  print(f"-> Submit button disabled: {submit_disabled}")

  if not submit_disabled:
    print("6. Clicking Procesar Preventa...")
    # Since print() blocks in Playwright headless unless mock print is set up,
    # we can intercept window.print
    page.evaluate("window.print = function() { console.log('[PRINT INTERCEPTED] window.print called successfully'); };")
    page.locator("#btn-submit-preventa").click()
    page.wait_for_timeout(3000)
    page.screenshot(path="/home/jules/verification/preventa_processed.png")

if __name__ == "__main__":
  # Create verification folder
  import os
  os.makedirs("/home/jules/verification", exist_ok=True)

  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      run_verification(page)
    finally:
      browser.close()
