# Mastercard Scholars Atlas — GitHub launch

This package is the standalone GitHub Pages edition of the Atlas, prepared from source commit cf461f3c930e28300da6b434c587858eef505a9a on 31 October 2026. It contains 87 directory profiles and 9 confirmed scholar journeys (67 chapters). It does not need a build command or a backend server.

## Launch on AnalemJacob's GitHub account

1. Extract the ZIP on your computer. Open the extracted folder. You should see index.html alongside the data, media and vendor folders.
2. Sign into GitHub as AnalemJacob. Choose + → New repository. Name it mastercard-scholars-atlas. For GitHub Free Pages, choose Public. Leave the README, .gitignore and licence initialisation options unchecked because this package already contains the site files. Click Create repository.
3. On the empty repository page, choose “uploading an existing file”. If the repository already has files, choose Add file → Upload files.
4. Drag all the CONTENTS of the extracted folder onto the upload page. Upload index.html, data/, media/, vendor/ and the other files together. Do not upload the ZIP or put everything inside another outer folder. This package has fewer than 100 files.
5. Commit the uploaded files to main. Confirm that index.html is at the repository's top level. Include the empty .nojekyll file at that level.
6. Open Settings → Pages. Under Build and deployment select Deploy from a branch. Choose main and /(root), then Save.
7. Wait for the Pages deployment to succeed. The Pages settings will show the live URL. With the name above, the expected address is https://AnalemJacob.github.io/mastercard-scholars-atlas/ . This address becomes available only after you create the repository and deploy it.
8. Open the site. Check Follow a scholar, Next, the pink arrow/ring, repeated locations, the street/satellite switch and portrait images. If deployment fails, inspect the Actions tab.

GitHub reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## How changing a file updates the map

The website reads the JSON files below when a visitor loads the page. Saving a change in GitHub creates a commit. GitHub then republishes the site. Visitors see the new data after publication and a page refresh; an already-open page does not live-sync by itself.

| Edit this file | What it controls |
| --- | --- |
| data/scholars.json | Directory names, university/cohort, home country, hometown, bio, photo path and LinkedIn link |
| data/journeys.json | Follow Scholar chapters, point coordinates, location notes and separate project information |
| data/leaders.json | Programme directors and leadership profiles |
| data/social_directory.json | Organisation/university social-media directory |
| media/ | Portrait images and other existing visual assets |

For a confirmed scholar, the directory and journey each store the name and hometown. Keep those values consistent in scholars.json and journeys.json when changing them. Keep the same stable scholar ID in both files. Adding a new scholar requires a directory entry; add a matching journey entry if you also want the custom Follow Scholar route.

The geographic coordinates inside a journey chapter are what move the camera. Editing a separate spreadsheet or a place name alone does not geocode that location automatically. Always update the chapter's coordinates when changing its location.

Example point format: "coordinates": [-2.48272, 6.22059]
The order is LONGITUDE, then LATITUDE.

- For a repeated place, reuse the same place_id and coordinates in its consecutive chapters. Next will update the description without another flight or zoom.
- The current project details belong in the journey record's projects array, outside its steps array. Keep projects out of the steps array.
- Use a mapped facility point when supported; label a representative town/area point honestly. Keep coordinate_source and precision with each stop.
- Keep existing JSON quotation marks, commas, square brackets and braces intact. A malformed file can prevent data from loading.

To edit in GitHub: open the file → pencil/Edit this file → change the value → Commit changes to main → wait for Pages to deploy → refresh the live site. Revert the commit in GitHub if you need to undo a mistake.

## What “backend” means here

GitHub is the editing and version-history area. The data folder is your editable data source. These JSON files are publicly readable once the site launches; they are not a private database. Only authorised repository editors can change the repository. GitHub Pages does not execute a PHP, Python or Node backend server.

The site's Add your data / CSV import control remains a browser-local preview tool. Its changes affect that browser only. For shared updates, edit the published data files above. Google Form responses do not automatically become map records in this version.

For a future private database, login-based web editor or automatic survey-to-map workflow, add a separate backend/data integration rather than putting credentials in the website files.

## Hosting requirements

- A GitHub account with access to the repository and a verified email address.
- A public repository for GitHub Free Pages.
- The complete extracted website, with index.html at the publishing root and all asset folders preserved.
- Pages enabled for main / root and a successful deployment.
- An internet connection for the detailed street and satellite backgrounds.

The github.io address is sufficient; buying a domain is optional. A custom domain can be connected later in Settings → Pages.

Only publish profile, photo and location information approved for public release. The original response workbook, source credentials and internal import-review files are not included in this upload package. This Atlas is an independent scholar-created project, not an official Mastercard Foundation directory.

## Credits

- Leaflet: vendor/LEAFLET_LICENSE.txt
- Papa Parse: vendor/PAPAPARSE_LICENSE.txt
- Country boundaries: Natural Earth, public domain: https://www.naturalearthdata.com/about/terms-of-use/
- Street/satellite backgrounds: Esri and the sources credited in the map attribution.
- Coordinate references and precision notes remain in each journey chapter.

GitHub Pages documentation:
https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Media gallery and journey controls

Use **Media gallery** in the header to browse existing scholar and leadership portraits. Search, filter by collection and open an image to view it at a larger size. **Open scholar on map** opens the matching profile.

To add community, school or journey media, upload the file into `media/` and add an entry to `data/gallery.json`. This file starts as an empty array; portraits load automatically from scholars.json and leaders.json. Example:

```json
[
  {
    "src": "media/community-photo.jpg",
    "title": "A day with our cohort",
    "caption": "Add your own description here",
    "scholar_id": "ubc2026_032",
    "type": "image",
    "source": ""
  }
]
```

Use `type: "video"` for a directly hosted MP4 or `type: "audio"` for a directly hosted audio file. Keep media sizes modest for fast loading. Use an existing scholar ID to link a photograph to that person's profile. The gallery uses supplied captions and never invents locations or memories.

During **Follow a scholar**, the progress strip opens any stop. **Play** waits for each flight to finish, pauses at the destination for about four seconds, then advances. **Pause** stops automatic advancement; an in-progress camera flight completes normally. **Replay** returns to the hometown. Manual navigation stops autoplay. Repeated places retain the existing stationary behaviour. **Share this scholar** copies a link to that profile or the selected journey stop.

The represented-country panel can be hidden or expanded. Country labels adapt to the available map space; markers and hover labels remain available for every represented country.
