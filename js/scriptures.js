/*==================================================================
* File:   scriptures.js
* AUTHOR: Stephen W. Liddle, re-created by Chris Edwards
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
    console, XMLHttpRequest
 */
/*property
    books, classKey, content, forEach, getElementById, hash, href, id, init,
    innerHTML, length, log, maxBookId, minBookId, numChapters, onHashChanged,
    onerror, onload, open, parse, push, response, send, slice, split, status
*/

let Scriptures = (function () {
  "use strict";

  /*---------------------------------------------------------------
  *                              CONSTANTS
  */
  const BOTTOM_PADDING = "<br /><br />";
  const CLASS_BOOKS = "books";
  const CLASS_VOLLUME = "volume";
  const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
  const DIV_SCRIPTURES = "scriptures";
  const REQUEST_GET = "GET";
  const REQUEST_STATUS_OK = 200;
  const REQUEST_STATUS_ERROR = 400;
  const TAG_VOLUME_HEADER = "h5";
  const URL_BOOKS = "https://scriptures.byu.edu/mapscrip/model/books.php";
  const URL_VOLUMES = "https://scriptures.byu.edu/mapscrip/model/volumes.php";

  /*---------------------------------------------------------------
  *                             PRIVATE VARIABLES
  */
  let books;
  let volumes;

  /*---------------------------------------------------------------
  *                             PRIVATE METHOD DECLARATIONS
  */
  let ajax;
  let bookChapterValid;
  let cacheBooks;
  let htmlAnchor;
  let htmlDiv;
  let htmlElement;
  let htmlLink;
  let init;
  let navigateBook;
  let navigateChapter;
  let navigateHome;
  let onHashChanged;

  /*---------------------------------------------------------------
  *                             PRIVATE METHODS
  */
  ajax = function (url, successCallback, failureCallback) {
    // Source: http://youmightnotneedjquery.com/
    let request = new XMLHttpRequest();
    request.open(REQUEST_GET, url, true);

    request.onload = function () {
      if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
        // Success!
        let data = JSON.parse(request.response);

        if (typeof successCallback === "function") {
          successCallback(data);
        }
      } else {
        // We reached our target server, but it returned an error
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

  htmlAnchor = function (volume) {
    return `<a name="v${volume.id}" />`;
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

  htmlLink = function (parameters) {
    let classString = "";
    let contentString = "";
    let hrefString = "";
    let idString = "";

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

    return `<a${idString}${classString}${hrefString}>${contentString}</a>`;
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
    console.log("navigateBook " + bookId);
  };

  navigateChapter = function (bookId, chapter) {
    console.log("navigateChapter " + bookId + ", " + chapter);
  };

  navigateHome = function (volumeId) {
    document.getElementById("scriptures").innerHTML =
      "<div>The Old Testament</div>" +
      "<div>The New Testament</div>" +
      "<div>The Book of Mormon</div>" +
      "<div>Doctrine and Covenants</div>" +
      "<div>The Pearl of Great Price</div>" + volumeId;
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
  };

  /*---------------------------------------------------------------
  *                                 PUBLIC API
  */

  return {
    init,
    onHashChanged
  };
}());
