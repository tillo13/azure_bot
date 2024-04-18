from datetime import datetime
import subprocess
import sys
import time
import os
from PIL import ImageEnhance


# Function to install Python packages using pip
def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install necessary packages
install("pillow")  # For image handling
install("diffusers")  # For the diffusion pipeline
install("transformers")  # For the transformers
install("accelerate")  # For hardware acceleration features
install("safetensors")  # For safe serialization of tensors

# Now import the installed packages
from PIL import Image
from diffusers import DiffusionPipeline
import torch

# Define the number of images to generate
NUMBER_OF_IMAGES_TO_CREATE = 500

# Use the current epoch time as the seed
SEED = int(time.time())
torch.manual_seed(SEED)

# Define the prompt
PROMPT_TO_CREATE = """
a tattered and creased vintage photo sits on a dark table. the vintage photo has a young woman looking back over her right shoulder at the camera. HER hair is in beehive long and straight, with small headband. She has a soft modest smile with well-defined ARCHED eyebrows. The image exudes a vintage aura.
"""

# Define the model to use
MODEL_ID = "SG161222/RealVisXL_V3.0"

# Define the number of inference steps (if different from model's default)
NUM_INFERENCE_STEPS = 99

# Helper function to format time duration
def format_time(duration):
    minutes, seconds = divmod(duration, 60)
    return f"{int(minutes)} minutes {seconds:06.3f} seconds"

# Helper function to open the image with the default image viewer
def open_image(full_path):
    try:
        if sys.platform == "darwin":  # macOS
            subprocess.run(["open", full_path])
        elif sys.platform == "win32":  # Windows
            os.startfile(full_path)
        elif sys.platform.startswith('linux'):  # Linux
            subprocess.run(["xdg-open", full_path])
        else:
            print("Platform not supported for opening image.")
    except Exception as e:
        print(f"Failed to open image: {e}")

def post_process_image(image):
    """
    Apply post-processing steps to the generated image.
    Args:
        image: PIL.Image object
    Returns:
        image: Enhanced PIL.Image object
    """
    # Upscale the image; you can change the size to whatever you want
    upscale_factor = 2  # Example: Upscale by a factor of 2
    new_size = (int(image.width * upscale_factor), int(image.height * upscale_factor))
    image = image.resize(new_size, Image.LANCZOS)

    # Sharpen the image
    sharpness_enhancer = ImageEnhance.Sharpness(image)
    image = sharpness_enhancer.enhance(2.0)  # Enhancement factor can be adjusted

    # Increase contrast if necessary
    contrast_enhancer = ImageEnhance.Contrast(image)
    image = contrast_enhancer.enhance(1.5)  # Enhancement factor can be adjusted

    return image

def main():
    start_time = time.time()
    generation_times = [] 
    hardware_summary = {}

    # Create directory for images
    images_directory = "created_images"
    os.makedirs(images_directory, exist_ok=True)

    # Hardware setup
    # Check if CUDA is available and set the device accordingly
    if torch.cuda.is_available():
        device = "cuda"
        cuda_device_name = torch.cuda.get_device_name(0)
        cuda_device_memory = torch.cuda.get_device_properties(device).total_memory
        cuda_device_memory_gb = cuda_device_memory / (1024 ** 3)
        hardware_summary['Device Type'] = "GPU"
        hardware_summary['Device Name'] = cuda_device_name
        hardware_summary['Device Memory (GB)'] = f"{cuda_device_memory_gb:.2f}"
        hardware_summary['CUDA Version'] = torch.version.cuda
        print(f"PyTorch version: {torch.__version__}")
        print(f"Using device: {cuda_device_name} with {cuda_device_memory_gb:.2f} GB of GPU memory and CUDA version {torch.version.cuda}")
    else:
        device = "cpu"
        cpu_threads = torch.get_num_threads()
        hardware_summary['Device Type'] = "CPU"
        hardware_summary['Available Threads'] = cpu_threads
        print(f"PyTorch version: {torch.__version__}")
        print(f"Using device: CPU with {cpu_threads} threads")

    # Load the model from Hugging Face, specifying the device to use for computation

    load_start_time = time.time()

    torch_dtype = torch.float16 if device == "cuda" else torch.float32
    # Set the random seed for reproducibility
    torch.manual_seed(SEED)

    # Create the diffusion pipeline with the new model
    pipe = DiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32
    ).to(device)

    load_model_time = format_time(time.time() - load_start_time)    

    for i in range(NUMBER_OF_IMAGES_TO_CREATE):
        print(f"Processing image {i+1} of {NUMBER_OF_IMAGES_TO_CREATE}...")

        # Generate the image from the text prompt
        generation_start_time = time.time()
        images_initial = pipe(prompt=PROMPT_TO_CREATE, num_inference_steps=NUM_INFERENCE_STEPS).images[0]

        generation_time = time.time() - generation_start_time
        generation_times.append(generation_time)

        images = post_process_image(images_initial)  # Use the new function to upscale and sharpen the image


        # Save the image with a timestamped filename
        timestamp = datetime.now().strftime("%Y_%m_%d_%H_%M_%S_%f")
        output_filename = f"{timestamp}_results.png"
        output_filepath = os.path.join(images_directory, output_filename)
        images.save(output_filepath)

        # Output the file location for each image
        full_path = os.path.abspath(output_filepath)
        print(f"Image {i+1}/{NUMBER_OF_IMAGES_TO_CREATE} saved in '{images_directory}' as {output_filename}")
        print(f"Full path: {full_path}")
        print(f"\nSingle image generation time: {format_time(generation_time)}")

        # Estimation parts
        remaining_images = NUMBER_OF_IMAGES_TO_CREATE - (i + 1)
        estimated_time_remaining = generation_time * remaining_images
        print(f"Estimated time remaining: ~{format_time(estimated_time_remaining)}")

        # Calculate and print estimated disk usage till current image
        estimated_disk_used_MB = (i + 1) * 1.65
        print(f"Estimated disk used so far: {estimated_disk_used_MB} MB\n")

        # Optional: Open the image using the default image viewer
        open_image(full_path)

    # After generating all images, calculate the average generation time and display it
    if generation_times:
        average_generation_time = sum(generation_times) / len(generation_times)
    else:
        average_generation_time = 0
        
    # Final Summary
    total_execution_time = format_time(time.time() - start_time)
    print("==== SUMMARY ====")
    print(f"Prompt Used: '{PROMPT_TO_CREATE}'")
    print(f"Total execution time for {NUMBER_OF_IMAGES_TO_CREATE} images: {total_execution_time}")
    print(f"Average time to produce an image: {format_time(average_generation_time) if generation_times else 'N/A'}")
    
    # Include hardware and prompt details in the final summary
    print("\n--- Hardware & Execution Details ---")
    for key, value in hardware_summary.items():
        print(f"{key}: {value}")

    # Calculate Total Estimated File Size
    total_estimated_file_size_MB = NUMBER_OF_IMAGES_TO_CREATE * 1.65
    print(f"Total estimated file size for {NUMBER_OF_IMAGES_TO_CREATE} images: {total_estimated_file_size_MB} MB")

if __name__ == "__main__":
    main()





