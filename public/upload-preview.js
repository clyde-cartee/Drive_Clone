const fileInput = document.getElementById('fileInput');
      const uploadText = document.querySelector('.upload-text');
      const previewContainer = document.querySelector('.upload-preview');
      const previewImg = document.querySelector('.preview-img');
      const previewName = document.querySelector('.preview-name');

      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        // update label text with filename
        uploadText.textContent = file.name;

        // show preview container
        previewContainer.style.display = 'flex';

        // if image — show thumbnail
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
          };
          reader.readAsDataURL(file);
        } else {
          // not an image — show file type icon instead
          previewImg.style.display = 'none';
          previewName.textContent = getIcon(file.type) + ' ' + file.name;
        }
      });

      function getIcon(type) {
        if (type.includes('pdf'))   return '📄';
        if (type.includes('word'))  return '📝';
        if (type.includes('sheet') || type.includes('excel')) return '📊';
        if (type.includes('zip') || type.includes('rar'))     return '🗜️';
        if (type.includes('video')) return '🎬';
        if (type.includes('audio')) return '🎵';
        return '📁';
      }