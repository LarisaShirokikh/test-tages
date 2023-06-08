import fs from 'fs';
import readline from 'readline';

const inputFilePath = 'input.txt'; 
const outputFilePath = 'output.txt'; 
const availableMemory = 500 * 1024 * 1024; 


async function sortAndWriteChunk(chunk: string[], chunkIndex: number): Promise<void> {
  const sortedChunk = chunk.sort(); // Сортировка части данных
  const tempFilePath = `temp_${chunkIndex}.txt`; // Временный файл для сохранения отсортированной части

  return new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempFilePath);

    writeStream.on('finish', () => {
      resolve();
    });

    writeStream.on('error', (error) => {
      reject(error);
    });

    sortedChunk.forEach((line) => {
      writeStream.write(line + '\n'); // Запись отсортированной строки в файл
    });

    writeStream.end();
  });
}


async function mergeSortedChunks(numChunks: number): Promise<void> {
  const inputStreams: fs.ReadStream[] = [];
  const outputStream = fs.createWriteStream(outputFilePath);

  // Создание ReadStream'ов для каждого временного файла
  for (let i = 0; i < numChunks; i++) {
    const tempFilePath = `temp_${i}.txt`;
    const readStream = fs.createReadStream(tempFilePath);
    inputStreams.push(readStream);
  }

  // Чтение строк из каждого ReadStream'а с использованием интерфейса readline
  const lineReaders = inputStreams.map((inputStream) => readline.createInterface({ input: inputStream }));

  // Функция для получения следующей строки из указанного lineReader
  function getNextLine(lineReader: readline.Interface): Promise<string> {
    return new Promise<string>((resolve) => {
      lineReader.once('line', (line) => {
        resolve(line);
      });
    });
  }

  // Сортировка и объединение частей
  const sortedLines: string[] = [];
  const currentLines: Promise<string>[] = lineReaders.map(getNextLine);

  while (currentLines.length > 0) {
    // Выбор наименьшей строки из текущих строк частей
    const minLine = await Promise.race(currentLines.filter(Boolean));

    // Определение индекса lineReader'а, из которого была выбрана строка
    const minIndex = currentLines.findIndex((linePromise) => linePromise && linePromise.then((line) => line === minLine));

    // Запись строки в итоговый файл
    outputStream.write(minLine + '\n');

    // Замена выбранной строки следующей строкой из соответствующего lineReader'а
    currentLines[minIndex] = getNextLine(lineReaders[minIndex]);
  }

  // Закрытие потоков и удаление временных файлов
  outputStream.end();
  inputStreams.forEach((inputStream) => inputStream.close());
  lineReaders.forEach((lineReader) => lineReader.close());
  await Promise.all(lineReaders.map((lineReader, i) => fs.promises.unlink(`temp_${i}.txt`)));
}


async function sortLargeFile(): Promise<void> {
  const readStream = fs.createReadStream(inputFilePath);
  const lineReader = readline.createInterface({ input: readStream });
  let chunk: string[] = [];
  let totalSize = 0;
  let numChunks = 0;

  for await (const line of lineReader) {
    chunk.push(line);
    totalSize += line.length + 1; // Добавляем 1 для символа новой строки '\n'

    if (totalSize >= availableMemory) {
      await sortAndWriteChunk(chunk, numChunks);
      chunk = [];
      totalSize = 0;
      numChunks++;
    }
  }

  // Обработка последней части
  if (chunk.length > 0) {
    await sortAndWriteChunk(chunk, numChunks);
    numChunks++;
  }

  // Завершение сортировки объединением частей
  await mergeSortedChunks(numChunks);
}


sortLargeFile()
  .then(() => {
    console.log('Файл успешно отсортирован.');
  })
  .catch((error) => {
    console.error('Произошла ошибка при сортировке файла:', error);
  });
