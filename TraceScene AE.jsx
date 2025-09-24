// Anime Scene Finder — Resizable, Responsive, Robust + True Jump & Trim Clip
function AnimeSceneFinder(thisObj) {
    var window = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Anime Scene Finder");
    window.orientation = "column";
    window.alignChildren = ["fill", "top"];
    window.spacing = 8;
    window.margins = 10;
    window.resizeable = true; // ✅ make main palette resizable

    var selectedFile = null;
    var lastFoundTime = null; // store timestamp of last found scene in seconds

    // Header
    var header = window.add("statictext", undefined, "Script by xsequent");
    header.justify = "center";

    // Buttons group
    var groupTwo = window.add("panel", undefined, "Buttons");
    groupTwo.orientation = "row";
    groupTwo.alignChildren = ["fill", "center"]; // responsive buttons
    groupTwo.margins = 8;

    var uploadbutton = groupTwo.add("button", undefined, "Upload Image");
    var findbutton = groupTwo.add("button", undefined, "Find-Scene");
    var clearbutton = groupTwo.add("button", undefined, "Clear");

    // Divider
    window.add("panel", undefined, undefined, { name: "divider" }).preferredSize = [1, 6];

    // Preview Panel
    var PREV_W = 200, PREV_H = 160; // smaller
    var PREV_MAXW = 180, PREV_MAXH = 140;

    var previewPanel = window.add("panel", undefined, "Preview");
    previewPanel.orientation = "stack";
    previewPanel.alignChildren = ["fill", "fill"];
    previewPanel.margins = 6;

    var previewContainer = previewPanel.add("group");
    previewContainer.alignment = ["fill", "fill"];
    previewContainer.orientation = "column";
    previewContainer.alignChildren = ["fill", "fill"];

    var canvasGroup = previewContainer.add("group");
    canvasGroup.alignment = ["fill", "fill"];
    canvasGroup.orientation = "row";
    canvasGroup.alignChildren = ["center", "center"];

    var previewCanvas = canvasGroup.add("panel", undefined, "");
    previewCanvas.alignment = ["fill", "fill"];
    previewCanvas.minimumSize = [PREV_W, PREV_H];
    previewCanvas.maximumSize = [10000, PREV_H]; // allow horizontal stretch
    previewCanvas._hasImage = false;
    previewCanvas._placeholder = "No image selected";

    previewCanvas.onDraw = function () {
        var g = this.graphics;
        var w = this.size[0];
        var h = this.size[1];

        // Clear background to prevent green leftover
        try {
            g.fillPath && (function () {
                var bg = g.newPath();
                bg.rect(0, 0, w, h);
                g.fillPath(bg, g.newBrush(g.BrushType.SOLID_COLOR, [0.08, 0.08, 0.08, 1]));
            })();
        } catch (e) { }

        if (!this._hasImage) {
            try {
                var txt = this._placeholder;
                var tf = g.measureString(txt);
                var tx = Math.round((w - tf[0]) / 2);
                var ty = Math.round((h - tf[1]) / 2);
                g.drawString && g.drawString(txt, tx, ty);
            } catch (e) { }
            return;
        }

        if (this._img) {
            var img = this._img;
            var imgW = (img.size && img.size[0]) ? img.size[0] : this._imgWidth || PREV_W;
            var imgH = (img.size && img.size[1]) ? img.size[1] : this._imgHeight || PREV_H;
            var fit = getFit(imgW, imgH, PREV_MAXW, PREV_MAXH);
            var dispW = fit[0], dispH = fit[1];
            var x = Math.round((w - dispW) / 2);
            var y = Math.round((h - dispH) / 2);

            try {
                g.drawImage(img, x, y, dispW, dispH);
            } catch (e) {
                try {
                    for (var i = this.children.length - 1; i >= 0; i--) this.remove(this.children[i]);
                    var ic = this.add("image", undefined, img);
                    ic.preferredSize = [dispW, dispH];
                    ic.alignment = ["center", "center"];
                } catch (e2) { }
            }
        }
    };

    // Status panel
    var statusPanel = window.add("panel", undefined, "Status");
    statusPanel.alignChildren = ["fill", "top"];
    statusPanel.margins = 6;
    var statusText = statusPanel.add("statictext", undefined, "No file selected", { multiline: true });
    statusText.characters = 35; // narrower

    // Jump & Trim
    var jumpButton = window.add("button", undefined, "Jump & Trim Clip");
    jumpButton.onClick = function () {
        if (lastFoundTime === null) { alert("⚠️ No timestamp available. Perform a search first."); return; }
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) { alert("⚠️ No active composition selected."); return; }
        if (comp.selectedLayers.length === 0) { alert("⚠️ No layer selected. Please select a layer to trim."); return; }

        app.beginUndoGroup("Jump & Trim Clip");

        var originalLayer = comp.selectedLayers[0];
        var startTime = lastFoundTime;
        var endTime = Math.min(lastFoundTime + 10, comp.duration);

        var trimmedLayer = originalLayer.duplicate();
        trimmedLayer.inPoint = startTime;
        trimmedLayer.outPoint = endTime;

        originalLayer.remove();

        comp.time = startTime;
        comp.workAreaStart = startTime;
        comp.workAreaDuration = endTime - startTime;

        app.endUndoGroup();

        // Deselect button to prevent green highlight
        try {
            jumpButton.active = false;
            window.active = false;
            window.active = true;
        } catch (e) { $.writeln("Button deselect error: " + e); }
    };

    function getFit(imgW, imgH, maxW, maxH) {
        var r = Math.min(maxW / imgW, maxH / imgH, 1);
        return [Math.max(1, Math.round(imgW * r)), Math.max(1, Math.round(imgH * r)), r];
    }

    function setPreviewFromFile(file) {
        selectedFile = file;
        statusText.text = "Selected: " + file.name;
        try {
            var img = ScriptUI.newImage(file.fsName);
            previewCanvas._img = img;
            previewCanvas._hasImage = true;
            if (img.size && img.size.length >= 2) {
                previewCanvas._imgWidth = img.size[0];
                previewCanvas._imgHeight = img.size[1];
            } else {
                previewCanvas._imgWidth = PREV_W;
                previewCanvas._imgHeight = PREV_H;
            }
            try { previewCanvas.notify("onDraw"); } catch (e) { }
            try { previewCanvas.repaint && previewCanvas.repaint(); } catch (e) { }
            previewPanel.layout.layout(true);
            window.layout.layout(true);
        } catch (err) {
            previewCanvas._hasImage = false;
            previewCanvas._placeholder = "Preview not available";
            try { previewCanvas.notify("onDraw"); } catch (e) { }
        }
    }

    uploadbutton.onClick = function () {
        var file = File.openDialog("Select an image file", "Images:*.jpg;*.jpeg;*.png");
        if (file) setPreviewFromFile(file);
    };

    clearbutton.onClick = function () {
        selectedFile = null;
        lastFoundTime = null;
        statusText.text = "No file selected";
        previewCanvas._hasImage = false;
        previewCanvas._img = null; // clear image
        previewCanvas._placeholder = "No image selected";

        // Force redraw
        try { previewCanvas.notify("onDraw"); } catch (e) { }
        try { previewCanvas.repaint && previewCanvas.repaint(); } catch (e) { }

        previewPanel.layout.layout(true);
        window.layout.layout(true);

        // ✅ Remove green highlight from button itself by moving focus elsewhere
        try {
            // Move focus to main panel
            window.active = false;
            window.active = true;
            if (window.children.length > 0) window.children[0].active = true;
        } catch (e) { $.writeln("Focus reset error: " + e); }
    };


    function parseNodeJSON(str) {
        try { return JSON.parse(str); } catch (e) { return str; }
    }

    findbutton.onClick = function () {
        if (!selectedFile || !(selectedFile instanceof File) || !selectedFile.exists) {
            alert("⚠️ No image selected. Please upload first.");
            return;
        }
        searchapi(selectedFile);
    };

    function searchapi(file) {
        var searchingDialog = new Window("palette", "Searching...");
        searchingDialog.orientation = "column";
        searchingDialog.alignChildren = ["center", "center"];
        searchingDialog.margins = 12;
        searchingDialog.add("statictext", undefined, "Searching for anime scene...");
        searchingDialog.show();

        var folder = File($.fileName).parent.fsName;
        var localNode = new File(folder + "/node/node.exe");
        var nodeCmd = localNode.exists ? '"' + localNode.fsName + '"' : "node";
        var nodeScriptPath = folder + "\\search_trace_moe.mjs";
        var cmd = nodeCmd + ' "' + nodeScriptPath + '" "' + file.fsName + '"';

        try {
            var result = system.callSystem(cmd);
            searchingDialog.close();
            if (!result) { statusText.text = "⚠️ No data returned from Node.js."; return; }

            var data = parseNodeJSON(result);

            if (typeof data === "object" && data.result && data.result.length > 0) {
                showAnimeResult(data.result[0]);
            } else {
                statusText.text = "Raw Node.js output received.";
                showRawFallback(result);
            }
        } catch (e) {
            try { searchingDialog.close(); } catch (_) { }
            statusText.text = "Error running Node.js: " + e.message;
        }
    }

    function showAnimeResult(anime) {
        lastFoundTime = anime.from;
        statusText.text = "Found: " + anime.title + " | Episode: " + anime.episode;

        var resultWindow = new Window("dialog", "Best Match");
        resultWindow.orientation = "column";
        resultWindow.alignChildren = ["center", "center"];
        resultWindow.margins = 12;

        // ✅ Scale result modal properly
        resultWindow.preferredSize = [400, 300];

        resultWindow.add("statictext", undefined, "Anime: " + anime.title);
        resultWindow.add("statictext", undefined, "Episode: " + anime.episode);
        resultWindow.add("statictext", undefined, "Similarity: " + (anime.similarity * 100).toFixed(2) + "%");
        resultWindow.add("statictext", undefined, "Time: " +
            Math.floor(anime.from / 60) + ":" + ("0" + Math.floor(anime.from % 60)).slice(-2) +
            " → " + Math.floor(anime.to / 60) + ":" + ("0" + Math.floor(anime.to % 60)).slice(-2));

        if (anime.thumbPath && File(anime.thumbPath).exists) {
            try {
                var thumb = ScriptUI.newImage(anime.thumbPath);
                var fit = getFit(thumb.size[0], thumb.size[1], 300, 200); // scale properly
                var tc = resultWindow.add("image", undefined, thumb);
                tc.preferredSize = [fit[0], fit[1]];
                tc.alignment = ["center", "center"];
            } catch (e) { }
        }

        resultWindow.add("button", undefined, "Close").onClick = function () { resultWindow.close(); };
        resultWindow.center(); resultWindow.show();
    }

    function showRawFallback(raw) {
        function grab(pattern, text) { var m = text.match(pattern); return (m && m[1]) ? m[1] : null; }

        var title = grab(/"title"\s*:\s*"([^"]+)"/, raw);
        var episode = grab(/"episode"\s*:\s*([0-9]+)/, raw);
        var similarity = grab(/"similarity"\s*:\s*([0-9.]+)/, raw);
        var from = grab(/"from"\s*:\s*([0-9.]+)/, raw);
        var to = grab(/"to"\s*:\s*([0-9.]+)/, raw);
        var thumbPath = grab(/"thumbPath"\s*:\s*"([^"]+)"/, raw);

        if (title || episode || similarity || from || to) {
            statusText.text = "Found (Raw): " + (title || "Unknown") + " | Episode: " + (episode || "?");

            var resultWindow = new Window("dialog", "Best Match (Raw Parsed)");
            resultWindow.orientation = "column";
            resultWindow.alignChildren = ["center", "center"];
            resultWindow.margins = 12;

            resultWindow.preferredSize = [400, 300]; // scale properly

            if (title) resultWindow.add("statictext", undefined, "Anime: " + title);
            if (episode) resultWindow.add("statictext", undefined, "Episode: " + episode);
            if (similarity) resultWindow.add("statictext", undefined, "Similarity: " + (parseFloat(similarity) * 100).toFixed(2) + "%");
            if (from && to) {
                resultWindow.add("statictext", undefined, "Time: " +
                    Math.floor(from / 60) + ":" + ("0" + Math.floor(from % 60)).slice(-2) +
                    " → " + Math.floor(to / 60) + ":" + ("0" + Math.floor(to % 60)).slice(-2)
                );
                lastFoundTime = parseFloat(from);
            }

            if (thumbPath && File(thumbPath).exists) {
                try {
                    var thumb = ScriptUI.newImage(thumbPath);
                    var fit = getFit(thumb.size[0], thumb.size[1], 300, 200);
                    var tcGroup = resultWindow.add("group");
                    tcGroup.alignment = ["center", "center"];
                    var tc = tcGroup.add("image", undefined, thumb);
                    tc.preferredSize = [fit[0], fit[1]];
                    tc.alignment = ["center", "center"];
                } catch (e) { }
            }

            resultWindow.add("button", undefined, "Close").onClick = function () { resultWindow.close(); };
            resultWindow.center(); resultWindow.show();
        } else {
            statusText.text = "⚠️ Raw Node.js output received (no parsable data)";
            var rawWindow = new Window("dialog", "Raw Output");
            rawWindow.orientation = "column";
            rawWindow.alignChildren = ["fill", "fill"];
            rawWindow.margins = 12;

            var rawText = rawWindow.add("edittext", undefined, raw, { multiline: true, scrolling: true });
            rawText.preferredSize = [350, 220];
            rawWindow.add("button", undefined, "Close").onClick = function () { rawWindow.close(); };
            rawWindow.center(); rawWindow.show();
        }
    }

    // ✅ Make panel responsive while resizing
    window.onResize = function () {
        try {
            window.layout.resize();
            window.layout.layout(true);
            previewPanel.layout.resize();
            previewPanel.layout.layout(true);
        } catch (e) {
            $.writeln("Resize error: " + e);
        }
    };

    return window;
}

// Create panel/window
var myPanel = AnimeSceneFinder(this);
if (myPanel instanceof Window) {
    myPanel.center();
    myPanel.show();
} else {
    myPanel.layout.layout(true);
    myPanel.layout.resize();
}




































