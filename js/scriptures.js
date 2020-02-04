/*==================================================================
* File:   scriptures.js
* AUTHOR: Chris Edwards, based on work done by Stephen W. Liddle
* DATE:   Winter 2020
*
* DESCRIPTION:  Front-end JavaScript code for The Scriptures, Mapped.
*               IS 542, Winter 2020, BYU.
*/
/*jslint
  browser: true
  long: true
 */
/*global
    console, L, map, XMLHttpRequest
 */
/*property
    addTo, bindTooltip, books, changeHash, classKey, clearLayers, content, exec,
    featureGroup, fitBounds, forEach, fullName, getAttribute, getBounds,
    getElementById, gridName, hash, href, id, includes, init, innerHTML, length,
    log, marker, maxBookId, maxZoom, minBookId, numChapters, onHashChanged,
    onclick, onerror, onload, opacity, open, parentBookId, parse, permanent,
    push, querySelectorAll, response, send, setView, showLocation, slice, split,
    status, title, tocName
*/

let Scriptures = (function () {
    "use strict";

    /*---------------------------------------------------------------
    *                              CONSTANTS
    */
    const BOTTOM_PADDING = "<br /><br />";
    const CLASS_BOOKS = "books";
    const CLASS_BUTTON = "btn";
    const CLASS_CHAPTER = "chapter";
    const CLASS_VOLUME = "volume";
    const DIV_BREADCRUMBS = "crumbs";
    const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
    const DIV_SCRIPTURES = "scriptures";
    const INDEX_FLAG = 11;
    const INDEX_LATITUDE = 3;
    const INDEX_LONGITUDE = 4;
    const INDEX_PLACENAME = 2;
    const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
    const REQUEST_GET = "GET";
    const REQUEST_STATUS_OK = 200;
    const REQUEST_STATUS_ERROR = 400;
    const TAG_LIST_ITEM = "li";
    const TAG_UNORDERED_LIST = "ul";
    const TAG_VOLUME_HEADER = "h5";
    const TEXT_TOP_LEVEL = "The Scriptures";
    const URL_BOOKS = "https://scriptures.byu.edu/mapscrip/model/books.php";
    const URL_SCRIPTURES = "https://scriptures.byu.edu/mapscrip/mapgetscrip.php";
    const URL_VOLUMES = "https://scriptures.byu.edu/mapscrip/model/volumes.php";

    /*---------------------------------------------------------------
    *                             PRIVATE VARIABLES
    */
    let books;
    let leafletMarkers = [];
    let leafletMarkerGroup = L.featureGroup();
    let prevNextDiv;
    let requestedBreadcrumbs;
    let volumes;

    /*---------------------------------------------------------------
    *                             PRIVATE METHOD DECLARATIONS
    */
    let addMarker;
    let ajax;
    let bookChapterValid;
    let booksGrid;
    let booksGridContent;
    let breadcrumbs;
    let cacheBooks;
    let changeHash;
    let chaptersGrid;
    let chaptersGridContent;
    let clearMarkers;
    let encodedScripturesUrlParameters;
    let getPrevNextHash;
    let getScripturesCallback;
    let getScripturesFailure;
    let htmlAnchor;
    let htmlButton;
    let htmlDiv;
    let htmlElement;
    let htmlHashLink;
    let htmlLink;
    let init;
    let navigateBook;
    let navigateChapter;
    let navigateHome;
    let nextChapter;
    let onHashChanged;
    let previousChapter;
    let setupMarkers;
    let showLocation;
    let titleForBookChapter;
    let volumeForId;
    let volumesGridContent;

    /*---------------------------------------------------------------
    *                             PRIVATE METHODS
    */
    addMarker = function () {
        if (leafletMarkers.length > 0) {
            leafletMarkers.forEach(function (markerArray) {
                let label = markerArray[0];
                let lat = markerArray[1];
                let lon = markerArray[2];

                L.marker([lat, lon]).bindTooltip(label, {
                    permanent: true,
                    opacity: 0.8
                }).addTo(leafletMarkerGroup);
            });

            leafletMarkerGroup.addTo(map);
            map.fitBounds(leafletMarkerGroup.getBounds(), {maxZoom: 10});
        }
    };

    ajax = function (url, successCallback, failureCallback, skipJsonParse) {
        let request = new XMLHttpRequest();
        request.open(REQUEST_GET, url, true);

        request.onload = function () {
            if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
                let data = (
                    skipJsonParse
                        ? request.response
                        : JSON.parse(request.response)
                );

                if (typeof successCallback === "function") {
                    successCallback(data);
                }
            } else {
                if (typeof failureCallback === "function") {
                    failureCallback(request);
                }
            }
        };

        request.onerror = failureCallback;
        request.send();
    };

    bookChapterValid = function (bookId, chapter) {
        let book = books[bookId];

        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }

        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }

        return true;
    };

    booksGrid = function (volume) {
        return htmlDiv({
            classKey: CLASS_BOOKS,
            content: booksGridContent(volume)
        });
    };

    booksGridContent = function (volume) {
        let gridContent = "";

        volume.books.forEach(function (book) {
            gridContent += htmlLink({
                classKey: CLASS_BUTTON,
                id: book.id,
                href: `#${volume.id}:${book.id}`,
                content: book.gridName
            });
        });

        return gridContent;
    };

    breadcrumbs = function (volume, book, chapter) {
        let crumbs;

        if (volume === undefined) {
            crumbs = htmlElement(TAG_LIST_ITEM, TEXT_TOP_LEVEL);
        } else {
            crumbs = htmlElement(TAG_LIST_ITEM, htmlHashLink("", TEXT_TOP_LEVEL));

            if (book === undefined) {
                crumbs += htmlElement(TAG_LIST_ITEM, volume.fullName);
            } else {
                crumbs += htmlElement(TAG_LIST_ITEM, htmlHashLink(`${volume.id}`, volume.fullName));

                if (chapter === undefined || chapter <= 0) {
                    crumbs += htmlElement(TAG_LIST_ITEM, book.tocName);
                } else {
                    crumbs += htmlElement(TAG_LIST_ITEM, htmlHashLink(`${volume.id},${book.id}`, book.tocName));
                    crumbs += htmlElement(TAG_LIST_ITEM, chapter);
                }
            }
        }

        return htmlElement(TAG_UNORDERED_LIST, crumbs);
    };

    cacheBooks = function (onInitializedCallback) {
        volumes.forEach(function (volume) {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }

            volume.books = volumeBooks;
        });

        if (typeof onInitializedCallback === "function") {
            onInitializedCallback();
        }
    };

    changeHash = function (volumeId, bookId, chapter) {
        let newHash = "";

        if (volumeId !== undefined) {
            newHash += volumeId;

            if (bookId !== undefined) {
                newHash += `:${bookId}`;

                if (chapter !== undefined) {
                    newHash += `:${chapter}`;
                }
            }
        }

        location.hash = newHash;
    };

    chaptersGrid = function (book) {
        return htmlDiv({
            classKey: CLASS_VOLUME,
            content: htmlElement(TAG_VOLUME_HEADER, book.fullName)
        }) + htmlDiv({
            classKey: CLASS_BOOKS,
            content: chaptersGridContent(book)
        });
    };

    chaptersGridContent = function (book) {
        let gridContent = "";
        let chapter = 1;

        while (chapter <= book.numChapters) {
            gridContent += htmlLink({
                classKey: `${CLASS_BUTTON} ${CLASS_CHAPTER}`,
                id: chapter,
                href: `#0:${book.id}:${chapter}`,
                content: chapter
            });

            chapter += 1;
        }

        return gridContent;
    };

    clearMarkers = function () {
        leafletMarkerGroup.clearLayers();
        leafletMarkers = [];
        map.setView([31.8, 35.9], 8);
    };

    encodedScripturesUrlParameters = function (bookId, chapter, verses, isJst) {
        if (bookId !== undefined && chapter !== undefined) {
            let options = "";

            if (verses !== undefined) {
                options += verses;
            }

            if (isJst !== undefined) {
                options += "&jst=JST";
            }

            return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses${options}`;
        }
    };

    getPrevNextHash = function (nextChapArray, prevChapArray) {
        let currentHash = [];
        let nextButton;
        let prevButton;
        let volume;

        if (location.hash !== "" && location.hash.length > 1) {
            currentHash = location.hash.slice(1).split(":");
            volume = currentHash[0];
        }

        if (nextChapArray !== undefined) {
            let nextBookId = nextChapArray[0];
            let nextChapId = nextChapArray[1];
            let nextChapTitle = nextChapArray[2];
            let nextHashArguments = `${volume},${nextBookId},${nextChapId}`;
            nextButton = htmlButton({
                content: " NEXT >>",
                onclick: `Scriptures.changeHash(${nextHashArguments})`,
                title: nextChapTitle
            });
        } else {
            nextButton = "";
        }

        if (prevChapArray !== undefined) {
            let prevBookId = prevChapArray[0];
            let prevChapId = prevChapArray[1];
            let prevChapTitle = prevChapArray[2];
            let prevHashArguments = `${volume},${prevBookId},${prevChapId}`;
            prevButton = htmlButton({
                content: "<< PREV ",
                onclick: `Scriptures.changeHash(${prevHashArguments})`,
                title: prevChapTitle
            });
        } else {
            prevButton = "";
        }

        prevNextDiv = htmlDiv({
            content: prevButton + nextButton
        });
    };

    getScripturesCallback = function (chapterHtml) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = prevNextDiv + chapterHtml;
        document.getElementById(DIV_BREADCRUMBS).innerHTML = requestedBreadcrumbs;

        setupMarkers();
    };

    getScripturesFailure = function () {
        console.log("Unable to retrieve chapter content from server.");
    };

    htmlAnchor = function (volume) {
        return `<a name="v${volume.id}" />`;
    };

    htmlButton = function (parameters) {
        let classString = "";
        let contentString = "";
        let idString = "";
        let onclickString = "";
        let titleString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }

        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }

        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }

        if (parameters.onclick !== undefined) {
            onclickString = ` onclick="${parameters.onclick}"`;
        }

        if (parameters.title !== undefined) {
            titleString = ` title="${parameters.title}"`;
        }

        return `<button ${idString}${classString}${titleString}${onclickString}>${contentString}</button>`;
    };

    htmlDiv = function (parameters) {
        let classString = "";
        let contentString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }

        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }

        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }

        return `<div${idString}${classString}>${contentString}</div>`;
    };

    htmlElement = function (tagName, content) {
        return `<${tagName}>${content}</${tagName}>`;
    };

    htmlHashLink = function (hashArguments, content, title) {
        return htmlLink({
            content,
            href: "javascript:void(0)",
            onclick: `Scriptures.changeHash(${hashArguments})`,
            title
        });
    };

    htmlLink = function (parameters) {
        let classString = "";
        let contentString = "";
        let hrefString = "";
        let idString = "";
        let onclickString = "";
        let titleString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }

        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }

        if (parameters.href !== undefined) {
            hrefString = ` href="${parameters.href}"`;
        }

        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }

        if (parameters.onclick !== undefined) {
            onclickString = ` onclick="${parameters.onclick}"`;
        }

        if (parameters.title !== undefined) {
            titleString = ` title="${parameters.title}"`;
        }

        return `<a${idString}${classString}${titleString}${hrefString}${onclickString}>${contentString}</a>`;
    };

    init = function (onInitializedCallback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax(URL_BOOKS, function (data) {
            books = data;
            booksLoaded = true;

            if (volumesLoaded) {
                cacheBooks(onInitializedCallback);
            }
        });

        ajax(URL_VOLUMES, function (data) {
            volumes = data;
            volumesLoaded = true;

            if (booksLoaded) {
                cacheBooks(onInitializedCallback);
            }
        });
    };

    navigateBook = function (bookId) {
        let book = books[bookId];
        let volume;

        if (book.numChapters <= 1) {
            navigateChapter(book.id, book.numChapters);
        } else {
            if (book !== undefined) {
                volume = volumeForId(book.parentBookId);
            }

            document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
                id: DIV_SCRIPTURES_NAVIGATOR,
                content: chaptersGrid(book)
            });
            document.getElementById(DIV_BREADCRUMBS).innerHTML = breadcrumbs(volume, book);
        }
    };

    navigateChapter = function (bookId, chapter) {
        let book = books[bookId];
        let nextChapArray = nextChapter(bookId, chapter);
        let prevChapArray = previousChapter(bookId, chapter);

        if (book !== undefined) {
            let volume = volumeForId(book.parentBookId);

            requestedBreadcrumbs = breadcrumbs(volume, book, chapter);
        }

        ajax(encodedScripturesUrlParameters(bookId, chapter), getScripturesCallback, getScripturesFailure, true);

        getPrevNextHash(nextChapArray, prevChapArray);
    };

    navigateHome = function (volumeId) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
            id: DIV_SCRIPTURES_NAVIGATOR,
            content: volumesGridContent(volumeId)
        });
        document.getElementById(DIV_BREADCRUMBS).innerHTML = breadcrumbs(volumeForId(volumeId));
    };

    nextChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {

            if (chapter < book.numChapters) {
                return [
                    bookId,
                    chapter + 1,
                    titleForBookChapter(book, chapter + 1)
                ];
            }

            let nextBook = books[bookId + 1];

            if (nextBook !== undefined) {
                let nextChapterValue = 0;

                if (nextBook.numChapters > 0) {
                    nextChapterValue = 1;
                }

                return [
                    nextBook.id,
                    nextChapterValue,
                    titleForBookChapter(nextBook, nextChapterValue)
                ];
            }
        }
    };

    onHashChanged = function () {
        let ids = [];

        if (location.hash !== "" && location.hash.length > 1) {
            ids = location.hash.slice(1).split(":");
        }

        if (ids.length <= 0) {
            navigateHome();
        } else if (ids.length === 1) {
            let volumeId = Number(ids[0]);

            if (volumeId < volumes[0].id || volumeId > volumes.slice(-1).id) {
                navigateHome();
            } else {
                navigateHome(volumeId);
            }
        } else if (ids.length >= 2) {
            let bookId = Number(ids[1]);

            if (books[bookId] === undefined) {
                navigateHome();
            } else {
                if (ids.length === 2) {
                    navigateBook(bookId);
                } else {
                    let chapter = Number(ids[2]);

                    if (bookChapterValid(bookId, chapter)) {
                        navigateChapter(bookId, chapter);
                    } else {
                        navigateHome();
                    }
                }
            }
        }

        if (leafletMarkers.length > 0) {
            clearMarkers();
        }
    };

    previousChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter > 1 && chapter <= book.numChapters) {
                return [
                    bookId,
                    chapter - 1,
                    titleForBookChapter(book, chapter - 1)
                ];
            }

            let previousBook = books[bookId - 1];

            if (previousBook !== undefined) {
                let previousChapterValue = 0;

                if (previousBook.numChapters > 0) {
                    previousChapterValue = previousBook.numChapters;
                }

                return [
                    previousBook.id,
                    previousChapterValue,
                    titleForBookChapter(previousBook, previousChapterValue)
                ];
            }
        }
    };

    setupMarkers = function () {
        if (leafletMarkers.length > 0) {
            clearMarkers();
        }

        document.querySelectorAll("a[onclick^=\"showLocation(\"]").forEach(function (element) {
            let matches = LAT_LON_PARSER.exec(element.getAttribute("onclick"));

            if (matches) {
                let placename = matches[INDEX_PLACENAME];
                let latitude = matches[INDEX_LATITUDE];
                let longitude = matches[INDEX_LONGITUDE];
                let flag = matches[INDEX_FLAG];

                if (flag !== "") {
                    placename += ` ${flag}`;
                }

                let duplicateMarker = false;

                leafletMarkers.forEach(function (existingMarker) {
                    if (leafletMarkers.length > 0) {
                        if (latitude === existingMarker[1] && longitude === existingMarker[2] && existingMarker[0].includes(placename)) {
                            duplicateMarker = true;
                        } else if (latitude === existingMarker[1] && longitude === existingMarker[2]) {
                            existingMarker[0] += ", " + placename;
                            duplicateMarker = true;
                        }
                    }
                });

                if (!duplicateMarker) {
                    let marker = [placename, latitude, longitude];
                    leafletMarkers.push(marker);
                }
            }
        });

        addMarker();
    };

    showLocation = function (geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        let zoomLevel;

        // TODO: figure out the best way to do this zoom level
        if (viewAltitude > 10000) {
            zoomLevel = 8;
        } else if (viewAltitude > 8000) {
            zoomLevel = 9;
        } else if (viewAltitude > 6000) {
            zoomLevel = 10;
        } else if (viewAltitude > 4000) {
            zoomLevel = 11;
        } else {
            zoomLevel = 12;
        }

        map.setView([latitude, longitude], zoomLevel);
    };

    titleForBookChapter = function (book, chapter) {
        if (book !== undefined) {
            if (chapter > 0) {
                return `${book.tocName} ${chapter}`;
            }
            return book.tocName;
        }
    };

    volumeForId = function (volumeId) {
        if (volumeId !== undefined && volumeId > 0 && volumeId <= volumes.length) {
            return volumes[volumeId - 1];
        }
    };

    volumesGridContent = function (volumeId) {
        let gridContent = "";

        volumes.forEach(function (volume) {
            if (volumeId === undefined || volumeId === volume.id) {
                gridContent += htmlDiv({
                    classKey: CLASS_VOLUME,
                    content: htmlAnchor(volume) + htmlElement(TAG_VOLUME_HEADER, volume.fullName)
                });

                gridContent += booksGrid(volume);
            }
        });

        return gridContent + BOTTOM_PADDING;
    };

    /*---------------------------------------------------------------
    *                                 PUBLIC API
    */

    return {
        changeHash,
        init,
        onHashChanged,
        showLocation
    };
}());
