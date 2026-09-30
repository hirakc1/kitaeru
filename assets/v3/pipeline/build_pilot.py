"""Rebuild every pilot asset in assets/v3 from the downloaded sources.

    python build_pilot.py <ubc_dir> <cmu_dir>

<ubc_dir>  folder holding Superhero_{Male,Female}_FullBody.gltf/.bin (from the pack's "Base Characters/Godot - UE")
           and T_Superhero_Male_Ligh.png / T_Superhero_Female_Light_BaseColor.png (from "Base Characters/Textures")
<cmu_dir>  folder holding 13.asf and 13_29.amc from http://mocap.cs.cmu.edu/subjects/13/
Outputs: ../body_m.glb, ../body_f.glb, ../clips/cmu_13_29.{m,f}.kclip.json
"""
import os, sys, subprocess, tempfile

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.dirname(here)


def run(*a):
    print('>', ' '.join(a)); subprocess.check_call([sys.executable, *a], cwd=here)


def main(ubc, cmu):
    run('pack_model.py', os.path.join(ubc, 'Superhero_Male_FullBody.gltf'), os.path.join(ubc, 'T_Superhero_Male_Ligh.png'), os.path.join(out, 'body_m.glb'))
    run('pack_model.py', os.path.join(ubc, 'Superhero_Female_FullBody.gltf'), os.path.join(ubc, 'T_Superhero_Female_Light_BaseColor.png'), os.path.join(out, 'body_f.glb'))
    lm = os.path.join(tempfile.gettempdir(), 'cmu_13_29.landmarks.json')
    run('cmu_to_landmarks.py', os.path.join(cmu, '13.asf'), os.path.join(cmu, '13_29.amc'), lm)
    os.makedirs(os.path.join(out, 'clips'), exist_ok=True)
    for k in 'mf':
        run('landmarks_to_clip.py', lm, os.path.join(out, f'body_{k}.glb'), os.path.join(out, 'clips', f'cmu_13_29.{k}.kclip.json'),
            '--name', 'CMU 13_29: jumping jacks, side twists, bend over, squats')


if __name__ == '__main__':
    main(*sys.argv[1:3])
