import * as twgl from "./twgl-full.module.js";

console.log("hello i am underwater")

const canvas = document.getElementById("c");
const viewportHeight = window.innerHeight - 150
canvas.width = viewportHeight
canvas.height = viewportHeight
console.log("clientheight: " + viewportHeight)
console.log(screen.height)
console.log(document.documentElement.clientWidth)

const gl = canvas.getContext("webgl2")
console.log(gl.getSupportedExtensions())

//I need extension to be able to render to FLOAT textures (Only took several hours to find this out :///):
gl.getExtension("EXT_color_buffer_float")

const keyboardCanvas = document.createElement("canvas");
keyboardCanvas.width = 4
keyboardCanvas.height = 1
keyboardCanvas.style.marginTop = "30px"
//keyboardCanvas.style.width = "40px"
//keyboardCanvas.style.height = "10px"

const keyCTX = keyboardCanvas.getContext("2d");
document.body.append(keyboardCanvas)

function setSnakeDirection(keyCode) {
    keyCTX.fillStyle = "red"
    if (keyCode == "ArrowUp") {
        keyCTX.fillRect(0, 0, 1, 1)
    }
    if (keyCode == "ArrowDown") {
        keyCTX.fillRect(1, 0, 1, 1)
    }
    if (keyCode == "ArrowLeft") {
        keyCTX.fillRect(2, 0, 1, 1)
    }
    if (keyCode == "ArrowRight") {
        keyCTX.fillRect(3, 0, 1, 1)
    }
    
    //callWholeGLProgram()
    document.dispatchEvent(new Event("updateTex"))
}

// Keyboard events
function clearSnakeDirection() {
    keyCTX.fillStyle = "black"
    keyCTX.fillRect(0, 0, keyboardCanvas.width, keyboardCanvas.height)
    document.dispatchEvent(new Event("updateTex"))
}
const keysIwant = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
document.addEventListener("keydown", (e) => {
    const keyCode = e.code;
    if (!(keysIwant.includes(keyCode))) return;
    console.log(e);
    setSnakeDirection(keyCode);
});

document.addEventListener("keyup", (e) => {
    const keyCode = e.code;
    if (!(keysIwant.includes(keyCode))) return;
    console.log(e)
    clearSnakeDirection();
});

// Mouse events
canvas.addEventListener("mousedown", (e) => {
    console.log("mousedown", e.offsetX, e.offsetY);
    
    // Calculate up/down/left/right assumes the shader is 600x600
    let x = e.offsetX - 300; 
    let y = e.offsetY - 300;
    let sorted = [
            {keyCode: "ArrowUp", sortKey: -y},
            {keyCode: "ArrowDown", sortKey: y},
            {keyCode: "ArrowLeft", sortKey: -x},
            {keyCode: "ArrowRight", sortKey: x}
        ].sort((a, b) => b.sortKey - a.sortKey);
    console.log(sorted);
    console.log(sorted[0]);
    setSnakeDirection(sorted[0].keyCode);
});

canvas.addEventListener("mouseup", clearSnakeDirection);

const updateTextureEvent = new CustomEvent("updateTex");

const mainVertexShaderPromise = fetch("./main.vert").then(
    (response) => {
        return response.text().then( (text) => {
            return text;
        })
    }
)

const mainFragmentShaderPromise = fetch("./main.frag").then(
    (response) => {
        return response.text().then( (text) => {
            return text;
        })
    }
)

const displayVertexShaderPromise = fetch("./display.vert").then(
    (response) => {
        return response.text().then( (text) => {
            return text;
        })
    }
)

const displayFragmentShaderPromise = fetch("./display.frag").then(
    (response) => {
        return response.text().then( (text) => {
            return text;
        })
    }
)

console.log(twgl.isWebGL2(gl))

window.addEventListener("resize", () => {
    const viewportHeight = window.innerHeight - 150
    canvas.width = viewportHeight
    canvas.height = viewportHeight
    callWholeGLProgram()
})

//Wrapped in this function so I can resize
function callWholeGLProgram() {

    Promise.all([mainVertexShaderPromise, mainFragmentShaderPromise, displayVertexShaderPromise, displayFragmentShaderPromise]).then((shadersText) => {
        console.log(shadersText)
        
        const programInfo = twgl.createProgramInfo(gl, shadersText.slice(0, 2))
        const displayInfo = twgl.createProgramInfo(gl, shadersText.slice(2, 4))
        
        let keyboardTex = twgl.createTexture(gl, {
            target: gl.TEXTURE_2D,
            minMag: gl.NEAREST,
            src: keyboardCanvas,
            width: 4,
            height: 1
        })

        
        
        console.log(keyboardTex)
        
        const attachments = [
            {
                attachmentPoint: gl.COLOR_ATTACHMENT0,
                format: gl.RGBA
            },
            {
                attachmentPoint: gl.COLOR_ATTACHMENT1,
                format: gl.RG,
                type: gl.FLOAT,
                internalFormat: gl.RG16F,
                minMag: gl.NEAREST,
                target: gl.TEXTURE_2D,
                wrap: gl.REPEAT
            },
            {
                attachmentPoint: gl.COLOR_ATTACHMENT2,
                format: gl.RG,
                type: gl.FLOAT,
                internalFormat: gl.RG16F,
                minMag: gl.NEAREST,
                target: gl.TEXTURE_2D,
                wrap: gl.REPEAT   
            }
        ]
        /*
        let test = twgl.createFramebufferInfo(gl, [
            {
                attachmentPoint: gl.COLOR_ATTACHMENT2,
                format: gl.RG,
                type: gl.FLOAT,
                internalFormat: gl.RG16F,
                minMag: gl.NEAREST,
                target: gl.TEXTURE_2D,
                wrap: gl.REPEAT
            }
        ])
        */
        

        let fb1 = twgl.createFramebufferInfo(gl, attachments)
        console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER))
        
        let fb2 = twgl.createFramebufferInfo(gl, attachments)
        console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER))
        let activeFB = fb1;
        let activeFB2 = fb2;
        
        twgl.bindFramebufferInfo(gl, null)
        console.log(fb1)
        console.log(fb2)
        console.log(fb1 === fb2)

        

        const arrays = {
            //Two triangles make a quad
            a_position: { numComponents: 2, data: [
                -1, -1,
                -1, 1,
                1, -1,

                1, -1,
                1, 1,
                -1, 1,
            ] },
        }

        const buffers = twgl.createBufferInfoFromArrays(gl, arrays)

        const mainUniforms = {
            u_resolution: [canvas.width, canvas.height],
            u_time: 0,
            u_kb: keyboardTex,
            u_pos: fb2.attachments[1],
            u_path: fb2.attachments[2]
            
        }
        
        document.addEventListener("updateTex", () => {
            keyboardTex = twgl.createTexture(gl, {
                target: gl.TEXTURE_2D,
                minMag: gl.NEAREST,
                src: keyboardCanvas,
                width: 4,
                height: 1
            })
            mainUniforms.u_kb = keyboardTex;
        })

        const displayUniforms = {
            u_resolution: [canvas.width, canvas.height],
            u_color: fb1.attachments[0],
            u_pos: fb1.attachments[1],
            u_path: fb1.attachments[2]
        }

        const headLocRawArray = new Float32Array((4))

        const draw = (time) => {

            //-----------main program-----------
            gl.useProgram(programInfo.program)
            gl.viewport(0, 0, canvas.width, canvas.height)

            const timeInSeconds = time * 0.001;
            mainUniforms.u_time = timeInSeconds;
            //mainUniforms.u_kb = keyboardTex;
            //console.log(timeInSeconds)
        
            
            twgl.setUniforms(programInfo, mainUniforms);

            twgl.setBuffersAndAttributes(gl, programInfo, buffers)
            twgl.bindFramebufferInfo(gl, fb1)
            //gl.drawBuffers seems absolutely necessary if you want to output to multiple textures from 1 shader! As in here i have 3 outputs
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
            twgl.drawBufferInfo(gl, buffers, gl.TRIANGLES, 6)

            //---------Read state variable from GPU to CPU--------------------
            //Default behaviour of readPixels is to read from gl.COLOR_ATTACHMENT0, but I want gl.COLOR_ATTACHMENT1
            //So i use gl.readBuffer to specify which buffer to read from. Sets the state for subsequent readPixels calls.
            gl.readBuffer(gl.COLOR_ATTACHMENT1)
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, headLocRawArray)
            //console.log(headLocArray)
            const snakeHead = getSnakeHeadLocation(headLocRawArray)

            //--------------displayProgram--------------
            gl.useProgram(displayInfo.program)
            gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
            twgl.setUniforms(displayInfo, displayUniforms);

            
            twgl.bindFramebufferInfo(gl, fb2)
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
            twgl.drawBufferInfo(gl, buffers, gl.TRIANGLES, 6)
            
            
            twgl.bindFramebufferInfo(gl, null)
            //mainUniforms.u_pos = activeFB.attachments[1]
            //mainUniforms.u_path = activeFB.attachments[2]
            //gl.drawBuffers([gl.NONE, gl.NONE, gl.NONE]);
            twgl.drawBufferInfo(gl, buffers, gl.TRIANGLES, 6)

            requestAnimationFrame(draw)
        }
        
        requestAnimationFrame(draw)
    })

}

callWholeGLProgram()

//Returns -1 if not successfull in getting the snakes head location
const getSnakeHeadLocation = (rawArray) => {
    const x = parseInt(rawArray[0] || -1)
    const y = parseInt(rawArray[1] || -1)

    console.log(`Snakes current head location -> x: ${x}, y: ${y}`)

    return [x, y]

}