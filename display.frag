#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_color;
uniform sampler2D u_pos;
uniform sampler2D u_path;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec2 posData;
layout(location = 2) out vec2 pathData;

void main() {

	vec2 uv = gl_FragCoord.xy/u_resolution;
	
	vec4 col = texture(u_color, uv);
	
	mat3 gaussianBlur = mat3(0.045, 0.122, 0.045,
							0.122, 0.0332, 0.122,
							0.045, 0.122, 0.045);
							
	float weight = 0.045 + 0.122 + 0.045 + 0.122 + 0.0332 + 0.122 + 0.045 + 0.122 + 0.045;
	
	vec4 rightNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x + 1.0, gl_FragCoord.y), 0) * gaussianBlur[2][1];
	vec4 leftNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x - 1.0, gl_FragCoord.y), 0) * gaussianBlur[0][1];
	vec4 topNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x, gl_FragCoord.y + 1.0), 0) * gaussianBlur[1][0];
	vec4 bottomNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x, gl_FragCoord.y - 1.0), 0) * gaussianBlur[1][2];
	
	vec4 topLeftNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x - 1.0, gl_FragCoord.y + 1.0), 0) * gaussianBlur[0][0];
	vec4 topRightNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x + 1.0, gl_FragCoord.y + 1.0), 0) * gaussianBlur[2][0];
	vec4 bottomLeftNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x - 1.0, gl_FragCoord.y - 1.0), 0) * gaussianBlur[0][2];
	vec4 bottomRightNeighbour = texelFetch(u_color, ivec2(gl_FragCoord.x + 1.0, gl_FragCoord.y - 1.0), 0) * gaussianBlur[2][2];
	
	vec4 blurredCol = (rightNeighbour + leftNeighbour + topNeighbour + bottomNeighbour
					  + topLeftNeighbour + topRightNeighbour + bottomLeftNeighbour + bottomRightNeighbour)/weight; 
	
	col = mix(col, blurredCol, 1.0);
	
	vec2 pos = texture(u_pos, uv).xy;
	vec2 path = texture(u_path, uv).xy;
	
	outColor = col;//vec4(1.0, 0.0, 0.0, 1.0);
	posData = pos;
	pathData = path;


}