import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

const FileUpload = ({ onFilesSelect }) => {
  const [files, setFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    onFilesSelect(newFiles);
  }, [files, onFilesSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (file) => {
    const newFiles = files.filter(f => f !== file);
    setFiles(newFiles);
    onFilesSelect(newFiles);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300
          ${isDragActive ? 'border-blue-400 bg-gray-800/50' : 'border-gray-600 hover:border-gray-500'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          <UploadCloud size={48} className="text-gray-400 mb-2" />
          {isDragActive ? (
            <p className="text-blue-400">Drop the files here ...</p>
          ) : (
            <p className="text-gray-400">Drag 'n' drop some files here, or click to select files</p>
          )}
        </div>
      </div>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-lg font-semibold">Selected Files:</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileIcon size={20} className="text-gray-400" />
                  <span className="text-sm">{file.name}</span>
                </div>
                <button onClick={() => removeFile(file)} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
