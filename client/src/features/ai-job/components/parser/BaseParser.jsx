import React from 'react'

// Базовий інтерфейс для всіх парсер-компонентів
// Кожен парсер має реалізувати цей інтерфейс

const BaseParser = ({
    parser,           // об'єкт парсера з parser.js
    jobs,             // масив спаршених jobs
    onUpdate          // колбек для оновлення батьківського компонента
}) => {
    // Цей компонент не використовується безпосередньо
    // Він показує інтерфейс, який повинен реалізувати кожен парсер

    return null
}

// Інтерфейс методів, які повинен мати кожен парсер:
export const ParserInterface = {
    // Рендерить help/instructions для парсера коли jobs.length === 0
    renderHelp: (parser) => {
        throw new Error('renderHelp method must be implemented')
    },

    // Опціонально: додаткова логіка для конкретного парсера
    // Наприклад, спеціальна обробка URL, валідація даних, тощо
    validateInput: (inputData) => {
        return true // базова реалізація
    },

    // Опціонально: спеціальні налаштування для парсера
    getParserConfig: () => {
        return {}
    }
}

export default BaseParser