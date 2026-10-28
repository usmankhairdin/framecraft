FRAMECRAFT
A free one-page architecture, interior and object photography HTML template

WHAT IS INCLUDED
One index.html, local CSS and vanilla JavaScript, six local photographs,
DM Sans variable font, Lenis 1.3.27, original bracket-frame SVG identity,
MIT/OFL notices and design/QA documentation. No framework, npm, React, Vite,
build process, remote runtime requests, backend or external booking service.

LOCAL USE
Open index.html directly for a quick look. For normal browser testing, serve
this folder with any static server. Example if Python is installed:
  python -m http.server 8080
Then visit http://localhost:8080/ and stop the server with Ctrl+C.
Serve this template folder, not the whole store workspace.

EDITING
Change text, image captions, navigation and form choices in index.html.
Change colours, spacing, image frames, type sizes and breakpoints in
assets/css/framecraft.css. Photo viewer titles/captions/credits and file paths
are in the photographs object in assets/js/framecraft.js. When replacing a
photo, update HTML src/alt/width/height and its JS metadata consistently.
Update the category filter counts if adding or removing photos.

Replace the stock images with work you have permission to present. The
supplied stock imagery is illustrative, not commissioned Framecraft work.
No client relationship, award, model or brand endorsement is claimed.
Edit the studio wording to match your actual offering, add your real contact
route and appropriate legal/privacy information before launching a business.
The photographs are not an asset library for standalone redistribution.

The category filter uses ordinary radios. Photo links open the viewer when
native dialog support and JS are available, otherwise they open the local
image file. The viewer includes previous/next, left/right arrow keys,
Home/End, Escape, caption and a reference action. Its sequence follows the
active category, unless opening a hero image outside that category.

Use as reference fills the reference panel and subject in the enquiry form.
Create enquiry draft renders an UNSENT text brief on the page. Download
creates a plain text file. No message is sent, no quote is generated, no
shoot is reserved and nothing is stored. Editing choices invalidates the
draft. Clear brief resets inputs and reference. Notes and project title
must not contain sensitive or personal contact information in this demo.
Connect your real contact/provider separately before accepting enquiries.

ACCESSIBILITY AND FALLBACKS
The menu slides from the right. Its same crop-frame control morphs to close;
Escape, focus containment/return, background inert/lock and desktop resize
closure are implemented. Page, menu and viewer Lenis regions share one clock.
Only normal-motion desktop wheel input is smoothed. Touch, reduced-motion
and unavailable Lenis preserve native scrolling. Slim activity scrollbars
support drag and Arrow/Page/Home/End keys. FAQ content uses measured,
reversible height and responds to content/viewport changes. No decorative
numbering or moving button shells are used.

Without JS all photos remain visible; navigation, local image links and
native details/FAQ remain usable. Reference buttons and draft creation stay
disabled, because those operations require JavaScript. Filtering needs JS.
The form uses native radio/checkbox controls rather than select or calendar
widgets. Its notes field grows with content when JS is active.

UPLOAD TO A DOMAIN ROOT
Upload index.html and the entire assets folder into the host's document
root, e.g. public_html/. Keep filename case intact. Visit https://your-domain/
and verify real images, font, fragment links, viewer and draft interactions.

UPLOAD IN A SUBFOLDER
Upload the same files to e.g. public_html/framecraft/. Visit
https://your-domain/framecraft/ . Runtime paths are relative. No base setting,
compile command or SPA rewrite is needed. Use the folder URL with trailing
slash, or your host's normal directory redirect.

CUSTOM DOMAIN
Follow your static host's DNS instructions, assign the uploaded folder as
the public web root, enable HTTPS, and test the final domain. The template
does not configure hosting, DNS, email or a contact provider.

LICENCES
Original template code/design: MIT, see LICENSE.
All third-party notices and full upstream code/font grants are included in
THIRD_PARTY_NOTICES.txt and licenses/. Photos retain the separate Pexels
licence. Review the source manifest and current Pexels terms for new uses;
never imply endorsement or sell unaltered standalone photo copies.
Keep upstream MIT/OFL notices when redistributing substantial source copies.

The footer reads: Designed & developed by Usman Khair Din, with only the
bold name linked to https://www.usmankhairdin.com/ . This is the supplied
credit treatment; actual licence obligations are in the licence texts.

REVIEW LIMITS
See docs/QA.md. Static validation is separate from the parent's rendered
browser review; this package does not claim live booking/contact testing.
