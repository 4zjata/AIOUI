"""Known file hoster and cloud storage domains."""

KNOWN_HOSTERS = {
    # Premium / Cyberlockers
    "rapidgator.net",
    "rg.to",
    "mega.nz",
    "mega.co.nz",
    "1fichier.com",
    "mediafire.com",
    "turbobit.net",
    "ddownload.com",
    "katfile.com",
    "nitroflare.com",
    "fikper.com",
    "k2s.cc",
    "keep2share.cc",
    "gofile.io",
    "pixeldrain.com",
    "workupload.com",
    "dropgalaxy.com",
    "dropgalaxy.in",
    "uploady.io",
    "sendspace.com",
    "easybytez.com",
    "alfafile.net",
    "filefactory.com",
    "uploaded.net",
    "ul.to",
    "uptobox.com",
    "krakenfiles.com",
    "filecrypt.cc",
    "terabox.com",
    "teraboxapp.com",
    "wetransfer.com",
    "hexupload.net",
    "userscloud.com",
    "uploadhaven.com",
    "fastclick.to",
    "dailyuploads.net",
    "clicknupload.click",
    "clicknupload.org",
    "hotlink.cc",
    "wdupload.com",
    "mexashare.com",
    "rosefile.net",
    "tezfiles.com",
    "subyshare.com",
    "world-files.com",
    "up-4ever.net",
    "file-upload.com",
    "uploadbank.com",
    "bowfile.com",
    "down.md",
    "daofile.com",
    # Cloud drives with raw file links
    "drive.google.com",
    "dropbox.com",
    "onedrive.live.com",
    "1drv.ms",
}

def is_known_hoster(hostname: str) -> bool:
    """Check if a hostname or parent domain is in the known hoster database."""
    if not hostname:
        return False
    hostname = hostname.lower()
    if hostname in KNOWN_HOSTERS:
        return True
    # Check parent domain (e.g. sub.rapidgator.net)
    parts = hostname.split(".")
    for i in range(1, len(parts) - 1):
        parent = ".".join(parts[i:])
        if parent in KNOWN_HOSTERS:
            return True
    return False
