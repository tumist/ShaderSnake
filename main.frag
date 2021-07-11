#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_kb;
uniform sampler2D u_pos;
uniform sampler2D u_path;
//uniform sampler2D u_position;
//layout(location = 1) uniform sampler2D u_pos1;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec2 posData;
layout(location = 2) out vec2 pathData;

#define numberOfTiles 24.0
#define snakeColor vec3(17.0/255.0, 212.0/255.0, 30.0/225.0)
#define foodColor vec3(1.0, 0.0, 0.0)
#define tailIncreaseRate 1.0
#define snakeSpeed 12.0

bool snakeCollision = false;
bool foodCollisionWithTail = false;

//Should return values from 0 to 1
float random(float seed) {
	return fract(sin(seed)*1003000.0);
}

//1d
float smoothNoise(float seed) {
	float integer = floor(seed); //Integer part
	float fraction = fract(seed); //Fractional part
	//y = random(i);
	float y = mix(random(integer), random(integer + 1.0), smoothstep(0.0, 1.0, fraction));
	return y; 
}

//size goes from 0.0 to 1.0;
float roundedRectangle(vec2 uv, float size) {
	
	uv = (uv * 2.0) - 1.0;
	
	size = size * 5.0;
	
	uv.x = smoothstep(0.6, 1.0, pow(uv.x,  size));
    uv.y = smoothstep(0.6, 1.0, pow(uv.y,  size));
   
    float d = length(vec2(uv.x, uv.y));
    
    float c = (1.0 - smoothstep(0.5, 0.54, d));
	
	return c;
}

vec2 rotateWhole(vec2 uv, float angle) {
	
	mat2 rotMat = mat2(cos(angle), -sin(angle), 
					   sin(angle), cos(angle));
	
	return rotMat * uv;
}


float bubblyBox(vec2 uv, float size) {

	uv = (uv * 2.0) - 1.0;
	uv = rotateWhole(uv, 0.785); //0.785
	uv = (uv / 2.0) + 0.5;
	
	uv = abs((uv * 2.0) - 1.0);
	uv += ((uv.x*1.6) * (uv.y*1.8)) * 0.1; 
	//uv = abs(sin(u_time)-1.5) - uv;
	
	float d = length(uv);
	
	float thresh = smoothstep(size, size + 0.03, d);//step(0.6, d);
	
	return 1.0 - thresh;

}


vec2 getDirection(vec2 currentMov) {
	
	//texture is 4x1 - Order: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
    vec4 keyUp = texelFetch(u_kb, ivec2(0, 0), 0);//texture(u_kb, vec2(38.0/256.0, 1.0));
    vec4 keyDown = texelFetch(u_kb, ivec2(1, 0), 0);
    vec4 keyLeft = texelFetch(u_kb, ivec2(2, 0), 0);
    vec4 keyRight = texelFetch(u_kb, ivec2(3, 0), 0);
	
	//currentMov != vec2(0.0, -1.0): is so that player cant collide with tail by going opposite direction
	
	if (keyUp.r == 1.0 && currentMov != vec2(0.0, -1.0)) {
		return vec2(0.0, 1.0);
	}
	
	if (keyDown.r == 1.0 && currentMov != vec2(0.0, 1.0)) {
		return vec2(0.0, -1.0);
	}
	if (keyLeft.r == 1.0 && currentMov != vec2(1.0, 0.0)) {
		return vec2(-1.0, 0.0);
	}
	
	if (keyRight.r == 1.0 && currentMov != vec2(-1.0, 0.0)) {
		return vec2(1.0, 0.0);
	}
	
	
	
	return currentMov;//vec2(0.0);

}


vec2 getStateDataUV(int i) {
	
	//int 0 = position data
	//int 1 change of movement for each step
	//int 2 running index
	//int 3 Food location
	//int 4 Size of tail
	
	//x length of 1 cell
	float xIndex = (1.0/numberOfTiles)/2.0;
	float lengthToNextCell = 1.0/numberOfTiles;
	
	float Yindex = 0.5;
	
	return vec2(xIndex + (lengthToNextCell * float(i)), Yindex);


}

vec2 getPixel(vec2 location) {

	vec2 singlePixel = texelFetch(u_pos, ivec2(location), 0).xy;
	
	return singlePixel;
	
}

//This stores every location of the head of snake in "path" texture
vec2 storeEveryLocation(vec2 newRunningIndex, vec2 oldPath, vec2 currentPos) {
	
	if (floor(gl_FragCoord.x) == floor(newRunningIndex.x) && floor(gl_FragCoord.y) == floor(newRunningIndex.y)) {
		oldPath = currentPos;
	} 
	
	return oldPath;
	
}


/*
StateData is the texture u_pos. It stores various game-state mutable variables.
u_pos texture sixe is same as the output viewport. It is 1-dimensional in the sense that
each unique piece of data is is divided against numberOfTiles on x-axis.
So if numberOfTiles = 30, then it can have 30 unique pieces of information.
Usually each "strip" is one memory location. 

Example: in the first strip(leftMost strip) I store the current location of the head of the snake.
This is updated each frame. Each frame this texture is updated -> First the old state from previous
frame is sampled(loaded) in, some logic is done on this info and a new state is written out again to the texture.

Current locations:
	//int 0 = position data
	//int 1 change of movement for each step
	//int 2 running index
	//int 3 Food location
	//int 4 Size of tail
*/
vec2 setNewStateData(vec2 stateData, ivec2 id, vec2 newData, int i) {
	if (id.x >= i  && id.x < (i + 1)) {
		stateData = newData;
	}
	return stateData;

}
/*
	Current locations:
	//int 0 = position data
	//int 1 change of movement for each step
	//int 2 running index
	//int 3 Food location
	//int 4 Size of tail
*/
vec2 getOldState(int i) {
	vec2 UV = getStateDataUV(i);
	vec2 oneRegion = texture(u_pos, UV).xy;
	return oneRegion;
}
/*
vec2 getFoodLocation(bool collisionHappened) {
	
	//vec2 foodLocUV = getStateDataUV(3);
	//vec2 foodLoc = texture(u_pos, foodLocUV).xy;
	vec2 foodLoc = getOldState(3);
	
	//Setting new postion for food if necessary
	if (foodLoc == vec2(0.0) || collisionHappened == true) {
		foodLoc = vec2(smoothNoise(u_time) * numberOfTiles, smoothNoise(u_time + 1.33) * numberOfTiles);
	}

	return foodLoc;

}
*/


//Draws the tail, 
vec3 drawTail(vec3 col, ivec2 id, int sizeOfTail, vec2 newRunningIndex, float singleCellShape, vec2 currentPos, vec2 foodLocation) {
	
    for (int i = 0; i < sizeOfTail; i++) {
    	float yIndex = newRunningIndex.y;
    	float xIndex = newRunningIndex.x - float((i+1));
    	//this if is necesary for when path texture starts a new line(+1 on y-axis)
    	if (xIndex < 0.0) {
    		yIndex -= 1.0;
    		xIndex = u_resolution.x + (newRunningIndex.x - float((i+1)));
    		//col = vec3(1.0, 0.0, 0.0);
    	}
    	
	    //vec2 tail1 = texelFetch(u_path, ivec2(newRunningIndex.x - (i+1), u_resolution.y/2.0), 0).xy;
	    vec2 tail1 = texelFetch(u_path, ivec2(xIndex, yIndex), 0).xy;
	    if (id == ivec2(tail1)) {
	    	col = singleCellShape * snakeColor;
	    }
	    
	    //Snake collides with its own tail
	    if (ivec2(tail1) == ivec2(currentPos)) {
	    	//col = vec3(1.0, 0.0, 0.0);
	    	snakeCollision = true;
	    }

		//food collides with tail:
		if (ivec2(tail1) == ivec2(foodLocation)) {
			foodCollisionWithTail = true;
		}
    }

	return col;
}

float circularWave(vec2 uv, vec2 origin, float timer) {
	
	if (timer == 0.0) {
		return 0.0;
	}
	
	//uv between -1 and 1
	uv = ((uv * 2.0) - 1.0) - origin;
	
	float d = distance(uv, origin);//length(uv);
	
	//float c = step(0.5, d) - step(0.6, d);
	float c = step(timer, d) - step(timer + 0.05, d);
	
	return c;
}

ivec2 circularWave2(ivec2 id, vec2 origin, float timer) {
	
	if (timer == 0.0) {
		return ivec2(-3);
	}
	//ivec2 iduv = id - (numberOfTiles/2);
	float d = distance(vec2(id), origin);
	
	float c = step(timer, d) - step(timer + 2.0, d);
	
	ivec2 cell = id * int(c);
	
	//If this si not here then cell (0, 0) will always be blue
	if (cell == ivec2(0.0)) {
		cell = ivec2(-1);
	}
	
	return cell;

}

void main()
{	
    //gl_fragCoords.xy contains the screen coordinates interpolated over whole quad (aka the canvas dimensions)
    vec2 uv = gl_FragCoord.xy/u_resolution;
    vec2 originalUV = uv;
    vec3 col = vec3(0.0);
    vec2 stateData = vec2(0.0);
    
    uv = uv * numberOfTiles;
    ivec2 id = ivec2(floor(uv));
    uv = fract(uv);
    
    //Getting state from previous frame...
    vec2 lastPos = getOldState(0);
    vec2 movEachStep = getOldState(1);
    vec2 newRunningIndex = getOldState(2);
    vec2 foodLoc = getOldState(3);
    vec2 sizeOfTail = getOldState(4);
    float circularWaveTimer = getOldState(5).x;
    vec2 lastCollisionSpot = getOldState(6);
    float gameOverTimer = getOldState(7).x;
    
    
    //---------------- current Location of head logic ------------
    //Last part here under is the speed of movement
	vec2 currentPos = lastPos;
	//reason for gameoverTimer check is so snake is stationary when resetting game
	if (gameOverTimer < 0.5) {
		//Last part here under is the speed of movement
		currentPos = lastPos + (movEachStep * (snakeSpeed / 100.0));//(movEachStep/8.0);
	}
    
    
    //case if snake goes over on the left side of viewport
    if (int(currentPos.x) == -1) {
    	currentPos = vec2(numberOfTiles, currentPos.y);
    }
    //Case if snake goes over on the right side of viewport
    if (int(currentPos.x) == int(numberOfTiles+1.0)) {
    	currentPos = vec2(0.0, currentPos.y);
    }
    //case if snake goes over on bottom side of viewport
    if (int(currentPos.y) == -1) {
    	currentPos = vec2(currentPos.x, numberOfTiles);
    }
    //Case if snake goes over on top side of viewport
    if (int(currentPos.y) == int(numberOfTiles+1.0)) {
    	currentPos = vec2(currentPos.x, 0.0);
    }
    
    stateData = setNewStateData(stateData, id, currentPos, 0);
    
    //----------------- Change of movement logic ----------------------
    //Checking direction vector, aka setting new direction if it has changed
    if (movEachStep != getDirection(movEachStep)) {
    	movEachStep = getDirection(movEachStep);
    } 
	//movEachStep = getDirection(movEachStep);
    stateData = setNewStateData(stateData, id, movEachStep, 1);
    
    //----------------------NewRunningIndex logic -----------------------
 	//running index is a bit special since its the index of where in texture u_path to
 	//store each loaction of the head.   
    if (ivec2(lastPos) != ivec2(currentPos)) {
    	vec2 indexToAdd = vec2(1.0, 0.0);
    	if (newRunningIndex.x == u_resolution.x) {
    		newRunningIndex = vec2(0.0, newRunningIndex.y + 1.0);
    	} else {
    		newRunningIndex += indexToAdd;
    	}
    }
    stateData = setNewStateData(stateData, id, newRunningIndex, 2);
	
	//-------------------- food location-collision logic ------------------
	bool collision = false;
	//Collision detection between food and head of snake
	//OBS: the "&& ivec2(currentPos) != ivec2(0.0)" is just so that tail starts at 0
    if (ivec2(currentPos) == ivec2(foodLoc) && ivec2(currentPos) != ivec2(0.0)) {
    	//col = vec3(0.0, 0.0, 1.0);
    	collision = true;
    }
	//Setting new postion for food if necessary
	if (foodLoc == vec2(0.0) || collision == true) {
		foodLoc = vec2(smoothNoise(u_time) * numberOfTiles, smoothNoise(u_time + 1.33) * numberOfTiles);
	}
	
	
	//--------------- Size of tail logic ----------------------
	//initial settings
	//if (sizeOfTail.x == 0.0) {
		//sizeOfTail = vec2(0.0, 0.0);
	//}
	if (collision == true) {
		sizeOfTail += vec2(tailIncreaseRate, 0.0);
		lastCollisionSpot = currentPos;
	}
	stateData = setNewStateData(stateData, id, sizeOfTail, 4);
	stateData = setNewStateData(stateData, id, lastCollisionSpot, 6);
	//----------------Custom timer for circular wave ------------
	if (collision == true || circularWaveTimer > 0.0) {
		circularWaveTimer += 0.2;
	}
	if (circularWaveTimer > (numberOfTiles + 2.0)) {
		circularWaveTimer = 0.0;
	}
	stateData = setNewStateData(stateData, id, vec2(circularWaveTimer, 0.0), 5);
	
	//-----------------Game over timer --------------------------
	//Increment back to zero if gameOverTimer is not 0. (it becomes 1 when snakeCollision == true)
	if (gameOverTimer > 0.0) {
		gameOverTimer -= 0.005;
		stateData = setNewStateData(stateData, id, vec2(gameOverTimer, 0.0), 7);
	}

    //---------------- Storing path data -------------------------
    vec2 oldPath = texture(u_path, gl_FragCoord.xy/u_resolution).xy; 
    vec2 path = storeEveryLocation(newRunningIndex, oldPath, currentPos);
    
    //---------------- Col draw commands --------------------------
    //Drawing grid
    float singleCellShape = bubblyBox(uv, 1.1);//roundedRectangle(uv, 0.5);
    col = col + singleCellShape;
    //Drawing food
    if (ivec2(foodLoc) == id) {
    	col = singleCellShape * foodColor;
    }
    //Drawing head of snake
    if (id == ivec2(currentPos)) {
    	col = singleCellShape * snakeColor;
    }
    //Drawing tail
    col = drawTail(col, id, int(sizeOfTail), newRunningIndex, singleCellShape, currentPos, foodLoc);
    
    ivec2 cc = circularWave2(id, lastCollisionSpot, circularWaveTimer);
    
    if (id == cc) {
    	/*
    	uv = (uv * 2.0) - 1.0;
		uv = rotateWhole(uv, 0.785); //0.785
		uv = (uv / 2.0) + 0.5;
    	*/
    	
    	//Rotation of affected cells
    	//vec2 cUV = (uv * 2.0) - 1.0;
    	//cUV = rotateWhole(cUV, u_time);
    	//cUV = (cUV / 2.0) + 0.5;
    	singleCellShape = bubblyBox(uv, 1.1);
    	col = singleCellShape * vec3(smoothNoise((u_time + 0.398) + float(id.x) + float(id.y))/1.0, smoothNoise(u_time + float(id.x) + float(id.y)), smoothNoise((u_time - 1.68) + float(id.x) + float(id.y))/1.0);
    }
    
    //snakeCollision = true is true ONLY for 1 frame.
    if (snakeCollision == true) {
    	gameOverTimer = 1.0;
    	stateData = setNewStateData(stateData, id, vec2(gameOverTimer, 0.0), 7);
    	
    	stateData = setNewStateData(stateData, id, vec2(0.0), 0);
    	stateData = setNewStateData(stateData, id, vec2(0.0), 1);
    	stateData = setNewStateData(stateData, id, vec2(0.0), 2);
    	stateData = setNewStateData(stateData, id, vec2(0.0), 4);
    	
    }

	//Special case for foodLocation
	if (foodCollisionWithTail == true) {
		foodLoc = vec2(smoothNoise(u_time) * numberOfTiles, smoothNoise(u_time + 1.33) * numberOfTiles);
	}
	stateData = setNewStateData(stateData, id, foodLoc, 3);
    
    //------------------ outputting to textures ----------------
    col -= gameOverTimer;
    outColor = vec4(col, 1.0);
    posData = vec2(stateData);
    pathData = path;
}