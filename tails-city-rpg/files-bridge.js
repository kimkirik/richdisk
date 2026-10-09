window.KirikFiles = {
  async save(data) {
    const blob = new Blob([String(data.text ?? "")], {type: data.mime || "application/octet-stream"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = String(data.name || "download").replace(/[\\/]/g, "_");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "saved";
  }
};
