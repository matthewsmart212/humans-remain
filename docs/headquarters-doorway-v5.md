# Headquarters doorway and terrain integration v5

The exterior doorway now opens onto the same persistent room and furniture used by the cutaway. A vector aperture removes only the painted false interior from the exterior draw, following the inner jambs and the damaged hanging brace. The room stays rendered beneath it; the roof and front panels alone fade during entry. Furniture no longer fades in independently. Both restored and ruined artwork use the same approach.

The ground contact uses a new ochre soil, leaf, pebble and moss decal. It crosses the lowest foundation pixels in the base pass, rather than floating outside the footprint as a separate pale border. A narrow contact shadow replaces the broad halo. No placement, dimensions, collision, save migration or progression changes were needed.

## Validation

Shared renderer tests compare the exact doorway floor pixels outside, during entry and inside for both building states. They also verify permanent foundation pixels, furniture visibility, room navigation and saved-world preservation. Root/native type checks, the production native renderer using offline assets, and the web production build are checked. Native captures include both building states and intermediate entry positions. No physical iPhone test was available.

## Artwork

Built-in ImageGen; saved asset: `public/survival/headquarters-south-v1/ground-contact-v5.webp` (1536 × 1024, RGBA, WebP quality 90, alpha quality 100). Original artwork remains in source.

Prompt: Edit the earlier transparent U-shaped foundation-contact decal to match the rich orange ochre rocky terrain in the supplied screenshot. Keep the same footprint around the stone foundations and central stair foot. Transparent top and center. Use a narrow irregular broken fringe of dark ochre soil, angular ochre pebbles, tiny dry amber leaves and sparse low olive moss, with tight contact shading. Leave irregular transparent gaps for original terrain. Small clusters may cross the stone feet by 5–12 pixels. Avoid a pale continuous dusty beige band, broad brown blob, gray gravel, new path, building, floor, stairs, HUD or characters. Match the crisp painterly game style and perspective.
