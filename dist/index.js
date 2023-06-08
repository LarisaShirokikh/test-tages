"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const inputFilePath = 'input.txt';
const outputFilePath = 'output.txt';
const availableMemory = 500 * 1024 * 1024;
function sortAndWriteChunk(chunk, chunkIndex) {
    return __awaiter(this, void 0, void 0, function* () {
        const sortedChunk = chunk.sort(); // Сортировка части данных
        const tempFilePath = `temp_${chunkIndex}.txt`; // Временный файл для сохранения отсортированной части
        return new Promise((resolve, reject) => {
            const writeStream = fs_1.default.createWriteStream(tempFilePath);
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
    });
}
function mergeSortedChunks(numChunks) {
    return __awaiter(this, void 0, void 0, function* () {
        const inputStreams = [];
        const outputStream = fs_1.default.createWriteStream(outputFilePath);
        // Создание ReadStream'ов для каждого временного файла
        for (let i = 0; i < numChunks; i++) {
            const tempFilePath = `temp_${i}.txt`;
            const readStream = fs_1.default.createReadStream(tempFilePath);
            inputStreams.push(readStream);
        }
        // Чтение строк из каждого ReadStream'а с использованием интерфейса readline
        const lineReaders = inputStreams.map((inputStream) => readline_1.default.createInterface({ input: inputStream }));
        // Функция для получения следующей строки из указанного lineReader
        function getNextLine(lineReader) {
            return new Promise((resolve) => {
                lineReader.once('line', (line) => {
                    resolve(line);
                });
            });
        }
        // Сортировка и объединение частей
        const sortedLines = [];
        const currentLines = lineReaders.map(getNextLine);
        while (currentLines.length > 0) {
            // Выбор наименьшей строки из текущих строк частей
            const minLine = yield Promise.race(currentLines.filter(Boolean));
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
        yield Promise.all(lineReaders.map((lineReader, i) => fs_1.default.promises.unlink(`temp_${i}.txt`)));
    });
}
function sortLargeFile() {
    var _a, e_1, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const readStream = fs_1.default.createReadStream(inputFilePath);
        const lineReader = readline_1.default.createInterface({ input: readStream });
        let chunk = [];
        let totalSize = 0;
        let numChunks = 0;
        try {
            for (var _d = true, lineReader_1 = __asyncValues(lineReader), lineReader_1_1; lineReader_1_1 = yield lineReader_1.next(), _a = lineReader_1_1.done, !_a; _d = true) {
                _c = lineReader_1_1.value;
                _d = false;
                const line = _c;
                chunk.push(line);
                totalSize += line.length + 1; // Добавляем 1 для символа новой строки '\n'
                if (totalSize >= availableMemory) {
                    yield sortAndWriteChunk(chunk, numChunks);
                    chunk = [];
                    totalSize = 0;
                    numChunks++;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = lineReader_1.return)) yield _b.call(lineReader_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Обработка последней части
        if (chunk.length > 0) {
            yield sortAndWriteChunk(chunk, numChunks);
            numChunks++;
        }
        // Завершение сортировки объединением частей
        yield mergeSortedChunks(numChunks);
    });
}
sortLargeFile()
    .then(() => {
    console.log('Файл успешно отсортирован.');
})
    .catch((error) => {
    console.error('Произошла ошибка при сортировке файла:', error);
});
